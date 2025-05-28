// commands/subscribe-to-queue.command.ts

import { Injectable, Inject } from '@nestjs/common';
import { Response, Request } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import { RedisService } from 'src/redis/redis.service';
import {
  ISubscribeToQueueCommand,
  IConnectionManager,
  ISseClientFactory,
  ICleanupService,
  ILogger,
  SseClient,
  CONNECTION_MANAGER_TOKEN,
  SSE_CLIENT_FACTORY_TOKEN,
  CLEANUP_SERVICE_TOKEN,
  LOGGER_TOKEN,
} from '../interfaces';
import { MessageFactory } from '../factories/message.factory';
import { WelcomeMessageDto } from '../dto';

@Injectable()
export class SubscribeToQueueCommand implements ISubscribeToQueueCommand {
  // 🔧 Parámetros se inyectan en tiempo de ejecución
  private queueId: string;
  private res: Response;
  private req: Request;
  private user: CurrentUser;
  private body: any;

  constructor(
    // ✅ Usar interfaces en lugar de implementaciones concretas (DIP)
    @Inject(CONNECTION_MANAGER_TOKEN)
    private readonly connectionManager: IConnectionManager,
    @Inject(SSE_CLIENT_FACTORY_TOKEN)
    private readonly clientFactory: ISseClientFactory,
    @Inject(CLEANUP_SERVICE_TOKEN)
    private readonly cleanupService: ICleanupService,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    private readonly redisService: RedisService,
    private readonly messageFactory: MessageFactory,
  ) {}

  /**
   * 🔧 Configurar parámetros antes de ejecutar
   */
  configure(
    queueId: string,
    res: Response,
    req: Request,
    user: CurrentUser,
    body: any,
  ): this {
    this.queueId = queueId;
    this.res = res;
    this.req = req;
    this.user = user;
    this.body = body;
    return this;
  }

  async execute(): Promise<void> {
    if (!this.queueId || !this.res || !this.req || !this.user) {
      throw new Error('Comando no configurado correctamente.');
    }

    try {
      this.logger.info('Iniciando suscripción a cola', {
        queueId: this.queueId,
        userId: this.user.id,
        email: this.user.email,
      });

      // 1. Configurar headers SSE
      this.setupSseHeaders();

      // 2. ✅ Crear cliente usando Factory con DTOs
      const { client, welcomeMessage } = this.createClientWithWelcome();

      this.logger.info('Cliente creado con Factory', {
        clientId: client.id,
        queueId: this.queueId,
        userId: this.user.id,
      });

      // 3. ✅ Agregar cliente usando ConnectionManager
      this.connectionManager.addConnection(this.queueId, client);

      // 🔍 DEBUG: Verificar que se agregó correctamente
      const clientCount = this.connectionManager.getConnectionCount(
        this.queueId,
      );
      this.logger.info('Cliente agregado al ConnectionManager', {
        queueId: this.queueId,
        clientId: client.id,
        totalClientsInQueue: clientCount,
      });

      // 4. Agregar usuario a Redis
      await this.addUserToRedis();

      // 5. ✅ Enviar mensaje de bienvenida usando Factory
      this.sendWelcomeMessage(welcomeMessage);

      // 6. Configurar limpieza al desconectar
      this.setupCleanupHandler(client);

      this.logger.info('Cliente suscrito exitosamente', {
        queueId: this.queueId,
        userId: this.user.id,
        email: this.user.email,
        clientId: client.id,
        totalClientsInQueue: clientCount,
      });
    } catch (error) {
      this.logger.error('Error en subscribeToQueue', error, {
        queueId: this.queueId,
        userId: this.user.id,
        email: this.user.email,
      });
      throw error;
    }
  }

  private setupSseHeaders(): void {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no');
    this.res.setTimeout(0);
  }

  /**
   * ✅ Crear cliente usando Factory con validación de DTOs
   */
  private createClientWithWelcome(): {
    client: SseClient;
    welcomeMessage: WelcomeMessageDto;
  } {
    const ticketData = {
      queueId: this.queueId,
      ticketNumber: this.parseTicketNumber(this.body.ticketNumber),
      estimatedWaitTime: this.parseEstimatedTime(this.body.estimatedWaitTime),
      moduleCode: this.body.moduleCode || undefined,
    };

    // ✅ Usar SseClientFactory con validación automática
    return this.clientFactory.createClientWithWelcome(
      this.user,
      this.res,
      ticketData,
    );
  }

  private async addUserToRedis(): Promise<void> {
    await this.redisService.addUserToQueue(this.queueId, this.user.id);

    this.logger.debug('Usuario agregado a Redis', {
      queueId: this.queueId,
      userId: this.user.id,
    });
  }

  /**
   * ✅ Enviar mensaje usando Factory con formateo automático
   */
  private sendWelcomeMessage(welcomeMessage: WelcomeMessageDto): void {
    try {
      // ✅ Usar MessageFactory para formatear
      const formattedMessage = this.messageFactory.formatForSSE(welcomeMessage);
      this.res.write(formattedMessage);

      this.logger.debug('Mensaje de bienvenida enviado', {
        queueId: this.queueId,
        userId: this.user.id,
        messageType: welcomeMessage.type,
      });
    } catch (error) {
      this.logger.error('Error enviando mensaje de bienvenida', error, {
        queueId: this.queueId,
        userId: this.user.id,
      });
      throw error;
    }
  }

  /**
   * ✅ Usar CleanupService para manejar desconexiones
   */
  private setupCleanupHandler(client: SseClient): void {
    let cleanupExecuted = false;

    const executeCleanup = async (reason: string) => {
      if (cleanupExecuted) {
        this.logger.debug('Cleanup ya ejecutado', {
          userId: this.user.id,
          email: this.user.email,
          reason,
        });
        return;
      }

      cleanupExecuted = true;

      this.logger.info('Ejecutando cleanup', {
        userId: this.user.id,
        email: this.user.email,
        queueId: this.queueId,
        clientId: client.id,
        reason,
      });

      try {
        // ✅ Usar CleanupService centralizado
        await this.cleanupService.cleanupUser(this.queueId, this.user.id);

        // También remover del ConnectionManager usando clientId
        this.connectionManager.removeConnection(this.queueId, client.id);

        const remainingClients = this.connectionManager.getConnectionCount(
          this.queueId,
        );

        this.logger.info('Cleanup completado', {
          userId: this.user.id,
          queueId: this.queueId,
          remainingClients,
          reason,
        });
      } catch (error) {
        this.logger.error('Error en cleanup', error, {
          userId: this.user.id,
          queueId: this.queueId,
          reason,
        });
      }
    };

    // Configurar event listeners
    this.req.on('close', () => executeCleanup('request close'));
    this.req.on('error', (error) => {
      this.logger.error('Error en request', error, {
        userId: this.user.id,
        email: this.user.email,
      });
      executeCleanup('request error');
    });

    this.res.on('error', (error) => {
      this.logger.error('Error en response', error, {
        userId: this.user.id,
        email: this.user.email,
      });
      executeCleanup('response error');
    });

    this.res.on('finish', () => executeCleanup('response finish'));
  }

  // 🔧 Métodos de utilidad para validar y parsear datos

  private parseTicketNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;

    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
  }

  private parseEstimatedTime(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;

    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(parsed) || parsed < 0 ? undefined : parsed;
  }

  /**
   * 🔍 Método para debugging - obtener estado actual del comando
   */
  public getCommandState(): any {
    return {
      queueId: this.queueId,
      userId: this.user?.id,
      userEmail: this.user?.email,
      hasRequest: !!this.req,
      hasResponse: !!this.res,
      responseDestroyed: this.res?.destroyed,
      responseWritable: this.res?.writable,
      body: this.body,
    };
  }
}
