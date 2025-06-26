// sse.service.ts
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
import { envs } from 'src/config/envs';

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private isInitialized = false;
  private readonly messageHandler: (channel: string, message: string) => void;
  private readonly urlFrontend: string;

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
    const frontendUrls = {
      development: 'http://192.168.1.89:3001',
      production: 'https://freeq.cl',
      test: 'https://test.freeq.cl',
    };

    this.urlFrontend = frontendUrls[envs.environment];
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

      // 7. ✅ NUEVO: Obtener y enviar estado inicial de la cola
      await this.sendCurrentQueueState(res, queueId);

      // 8. Configurar cleanup automático
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
   * ✅ NUEVO: Obtener y enviar estado inicial de la cola
   */
  private async sendCurrentQueueState(
    res: Response,
    queueId: string,
  ): Promise<void> {
    try {
      this.logger.info('Obteniendo estado actual de la cola', { queueId });

      // ✅ Obtener el estado actual de la cola desde Redis o base de datos
      const currentState = await this.getCurrentQueueState(queueId);

      if (currentState?.currentTicketNumber) {
        const initialStateMessage = {
          type: 'CURRENT_STATE',
          currentTicketNumber: currentState.currentTicketNumber,
          queueId,
          message: `Atendiendo actualmente el ticket ${currentState.currentTicketNumber}`,
          waitingTickets: currentState.waitingTickets || 0,
          estimatedWaitTime: currentState.estimatedWaitTime || 0,
          timestamp: new Date().toISOString(),
        };

        this.logger.info('Enviando estado inicial', {
          queueId,
          currentTicketNumber: currentState.currentTicketNumber,
          waitingTickets: currentState.waitingTickets,
        });

        const formattedMessage = `data: ${JSON.stringify(initialStateMessage)}\n\n`;
        res.write(formattedMessage);
      } else {
        // Si no hay ticket siendo atendido, enviar estado vacío
        const emptyStateMessage = {
          type: 'QUEUE_STATUS',
          queueId,
          message: 'No hay tickets siendo atendidos actualmente',
          currentTicketNumber: null,
          waitingTickets: 0,
          timestamp: new Date().toISOString(),
        };

        this.logger.info('Enviando estado vacío', { queueId });
        const formattedMessage = `data: ${JSON.stringify(emptyStateMessage)}\n\n`;
        res.write(formattedMessage);
      }
    } catch (error) {
      this.logger.error('Error obteniendo estado inicial de la cola', error, {
        queueId,
      });

      // Enviar error al cliente
      const errorMessage = {
        type: 'ERROR',
        queueId,
        error: 'No se pudo obtener el estado actual de la cola',
        timestamp: new Date().toISOString(),
      };

      const formattedMessage = `data: ${JSON.stringify(errorMessage)}\n\n`;
      res.write(formattedMessage);
    }
  }

  /**
   * ✅ NUEVO: Obtener estado actual de la cola
   * Aquí debes implementar la lógica según tu sistema
   */
  // En tu SseService, reemplaza getCurrentQueueState con esto:
  private async getCurrentQueueState(queueId: string): Promise<{
    currentTicketNumber: number | null;
    waitingTickets: number;
    estimatedWaitTime: number;
  } | null> {
    try {
      this.logger.info('🔍 Buscando estado actual de la cola', { queueId });

      // 🔍 OPCIÓN SIMPLE: Usar una clave Redis específica para el estado actual
      const currentTicketKey = `queue:${queueId}:current`;
      const currentTicketStr = await this.redisService.get(currentTicketKey);

      if (currentTicketStr) {
        const currentTicketNumber = parseInt(currentTicketStr, 10);
        this.logger.info('✅ Estado actual encontrado en Redis', {
          queueId,
          currentTicketNumber,
        });

        return {
          currentTicketNumber,
          waitingTickets: 0,
          estimatedWaitTime: 0,
        };
      }

      this.logger.warn('⚠️ No se encontró estado actual en Redis', { queueId });
      return null;
    } catch (error) {
      this.logger.error('❌ Error obteniendo estado de la cola', error, {
        queueId,
      });
      return null;
    }
  }

  /**
   * ✅ NUEVO: Método para actualizar el ticket actual (cuando el ejecutivo cambia de número)
   */
  async updateCurrentTicket(
    queueId: string,
    newTicketNumber: number,
  ): Promise<void> {
    try {
      this.logger.info('Actualizando ticket actual', {
        queueId,
        newTicketNumber,
      });

      // 1. Guardar en Redis el nuevo ticket actual
      const currentTicketKey = `queue:${queueId}:current_ticket`;
      await this.redisService.set(currentTicketKey, newTicketNumber.toString());

      // 2. Enviar evento a todos los clientes conectados
      const ticketCalledEvent = {
        type: 'TICKET_CALLED_EVENT',
        currentTicketNumber: newTicketNumber,
        queueId,
        message: `Ticket ${newTicketNumber} llamado`,
        timestamp: new Date().toISOString(),
      };

      // 3. Publicar en Redis para que llegue a todos los clientes SSE
      const channel = this.generateChannelName(queueId);
      await this.redis.publish(channel, JSON.stringify(ticketCalledEvent));

      this.logger.info('Evento de ticket llamado enviado', {
        queueId,
        newTicketNumber,
        channel,
      });
    } catch (error) {
      this.logger.error('Error actualizando ticket actual', error, {
        queueId,
        newTicketNumber,
      });
      throw error;
    }
  }

  // 🔧 Métodos privados de utilidad (sin cambios)
  private setupSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.setHeader('Access-Control-Allow-Origin', this.urlFrontend);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Cookie, Last-Event-ID',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

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
