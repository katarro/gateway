import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Redis } from 'ioredis';
import { REDIS_SUB_CLIENT } from 'src/config';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import {
  IChannelManager,
  IConnectionManager,
  IRedisMessageHandler,
  ICleanupService,
  ILogger,
  CHANNEL_MANAGER_TOKEN,
  CONNECTION_MANAGER_TOKEN,
  REDIS_MESSAGE_HANDLER_TOKEN,
  CLEANUP_SERVICE_TOKEN,
  LOGGER_TOKEN,
  SSE_CLIENT_FACTORY_TOKEN,
  ISseClientFactory,
} from './interfaces';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private isInitialized = false;
  private messageHandler: (channel: string, message: string) => void;

  constructor(
    @Inject(REDIS_SUB_CLIENT) private readonly redis: Redis,
    @Inject(CHANNEL_MANAGER_TOKEN)
    private readonly channelManager: IChannelManager,
    @Inject(REDIS_MESSAGE_HANDLER_TOKEN)
    private readonly redisMessageHandler: IRedisMessageHandler,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    @Inject(SSE_CLIENT_FACTORY_TOKEN)
    private readonly clientFactory: ISseClientFactory,
    @Inject(CONNECTION_MANAGER_TOKEN)
    private readonly connectionManager: IConnectionManager,
    @Inject(CLEANUP_SERVICE_TOKEN)
    private readonly cleanupService: ICleanupService,
    private readonly redisService: RedisService,
  ) {
    // Vincular el handler de mensajes
    this.messageHandler = this.redisMessageHandler.handleMessage.bind(
      this.redisMessageHandler,
    );
  }

  async onModuleInit(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('SseService ya está inicializado');
      return;
    }

    this.logger.info('Inicializando SseService...');

    // Registrar listener de Redis UNA VEZ
    this.redis.on('message', this.messageHandler);
    this.logger.info('Listener de Redis registrado');

    this.isInitialized = true;
    this.logger.info('SseService inicializado correctamente');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.info('Cerrando SseService...');

    // Limpiar listener
    this.redis.off('message', this.messageHandler);

    // Desuscribirse de todos los canales
    await this.channelManager.unsubscribeFromAll();

    this.isInitialized = false;
    this.logger.info('SseService cerrado');
  }

  /**
   * 🔗 Suscribir usuario a cola SSE
   */
  async subscribeToQueue(
    queueId: string,
    res: Response,
    req: Request,
    user: CurrentUser,
    ticketData: any,
  ): Promise<void> {
    this.logger.info(`Suscribiendo usuario a cola`, {
      email: user.email,
      queueId,
    });

    try {
      // 1. Asegurar suscripción a canal Redis
      const channel = this.generateChannelName(queueId);
      await this.channelManager.subscribeToChannel(channel);

      // 2. Crear cliente SSE con mensaje de bienvenida
      const { client, welcomeMessage } =
        this.clientFactory.createClientWithWelcome(user, res, {
          queueId,
          ticketNumber: ticketData.ticketNumber,
          estimatedWaitTime: ticketData.estimatedWaitTime,
          moduleCode: ticketData.moduleCode,
        });

      // 3. ✅ AGREGAR CLIENTE AL CONNECTION MANAGER
      this.connectionManager.addConnection(queueId, client);

      // 4. ✅ AGREGAR A REDIS
      await this.redisService.addUserToQueue(queueId, user.id);

      // 5. Configurar headers SSE
      this.setupSseHeaders(res);

      // 6. Enviar mensaje de bienvenida
      await this.sendWelcomeMessage(res, welcomeMessage);

      // 7. Configurar cleanup automático
      this.setupCleanupHandlers(req, res, queueId, user.id, client.id);

      // 🔍 DEBUG: Verificar estado
      const totalClients = this.connectionManager.getConnectionCount(queueId);
      this.logger.info(`Usuario suscrito exitosamente`, {
        email: user.email,
        queueId,
        clientId: client.id,
        totalClientsInQueue: totalClients,
      });
    } catch (error) {
      this.logger.error(`Error suscribiendo usuario`, error, {
        email: user.email,
        queueId,
      });
      throw error;
    }
  }

  /**
   * 📊 Obtener estadísticas del servicio
   */
  // getServiceStats(): any {
  //   return {
  //     initialized: this.isInitialized,
  //     connections: this.connectionManager.getDetailedStats(),
  //     channels: {
  //       subscribed: this.channelManager.getSubscribedChannels(),
  //       count: this.channelManager.getSubscriptionCount(),
  //     },
  //   };
  // }

  // 🔧 Métodos privados de utilidad
  private setupSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setTimeout(0);
  }

  private async sendWelcomeMessage(
    res: Response,
    welcomeMessage: any,
  ): Promise<void> {
    const formattedMessage = `data: ${JSON.stringify(welcomeMessage)}\n\n`;
    res.write(formattedMessage);
  }

  private setupCleanupHandlers(
    req: Request,
    res: Response,
    queueId: string,
    userId: string,
    clientId: string,
  ): void {
    let cleanupExecuted = false;

    const executeCleanup = async (reason: string) => {
      if (cleanupExecuted) return;
      cleanupExecuted = true;

      this.logger.info(`Ejecutando cleanup`, {
        userId,
        queueId,
        clientId,
        reason,
      });

      try {
        // ✅ Usar CleanupService centralizado
        await this.cleanupService.cleanupUser(queueId, userId);

        // También remover del ConnectionManager
        this.connectionManager.removeConnection(queueId, clientId);

        const remainingClients =
          this.connectionManager.getConnectionCount(queueId);
        this.logger.info(`Cleanup completado`, {
          userId,
          queueId,
          clientId,
          remainingClients,
          reason,
        });
      } catch (error) {
        this.logger.error(`Error en cleanup`, error, {
          userId,
          queueId,
          reason,
        });
      }
    };

    // Configurar event listeners
    req.on('close', () => executeCleanup('request close'));
    req.on('error', () => executeCleanup('request error'));
    res.on('error', () => executeCleanup('response error'));
    res.on('finish', () => executeCleanup('response finish'));
  }

  private generateChannelName(queueId: string): string {
    return `queue:${queueId}`;
  }
}
