// commands/subscribe-to-queue.command.ts

import { Injectable, Inject } from '@nestjs/common';
import { Response, Request } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import { RedisService } from 'src/redis/redis.service';
import { ClientManager } from '../managers/client.manager';
import { REDIS_SUB_CLIENT } from 'src/config';
import { Redis } from 'ioredis';
import { ISubscribeToQueueCommand } from '../interfaces/command.interface';

interface SseClient {
  res: Response;
  user: CurrentUser;
}

@Injectable()
export class SubscribeToQueueCommand implements ISubscribeToQueueCommand {
  private queueId: string;
  private res: Response;
  private req: Request;
  private user: CurrentUser;
  private body: any;

  constructor(
    private readonly clientManager: ClientManager,
    @Inject(REDIS_SUB_CLIENT) private readonly redis: Redis,
    private readonly redisService: RedisService,
  ) {}

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
      // 1. Configurar headers SSE
      this.setupSseHeaders();

      // 2. Crear y agregar cliente usando ClientManager
      const client = this.createClient();
      this.clientManager.addClient(this.queueId, client);

      // 3. Agregar usuario a Redis
      await this.addUserToRedis();

      // 4. Enviar mensaje de bienvenida
      this.sendWelcomeMessage();

      // 5. Configurar limpieza al desconectar
      this.setupCleanupHandler();

      console.log(
        `✅ Cliente ${this.user.email} agregado a cola ${this.queueId}`,
      );
    } catch (error) {
      console.error('❌ Error en subscribeToQueue:', error);
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

  private createClient(): SseClient {
    return { user: this.user, res: this.res };
  }

  private async addUserToRedis(): Promise<void> {
    await this.redisService.addUserToQueue(this.queueId, this.user.id);
  }

  private sendWelcomeMessage(): void {
    const welcomeMessage = {
      type: 'welcome',
      message: `Hola ${this.user.email}, te has unido exitosamente a la cola.`,
      ticketNumber: this.body.ticketNumber,
      estimatedWaitTime: this.body.estimatedWaitTime,
      moduleCode: this.body.moduleCode,
      timestamp: new Date().toISOString(),
    };

    this.res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);
  }

  private setupCleanupHandler(): void {
    // 🔧 Variables para evitar múltiples ejecuciones
    let cleanupExecuted = false;

    const executeCleanup = async (reason: string) => {
      if (cleanupExecuted) {
        console.log(
          `⚠️ Cleanup ya ejecutado para ${this.user.email} (${reason})`,
        );
        return;
      }

      cleanupExecuted = true;
      console.log(
        `🧹 Ejecutando cleanup para ${this.user.email} - Razón: ${reason}`,
      );

      try {
        // 1. Remover del ClientManager primero
        const wasRemoved = this.clientManager.removeClient(
          this.queueId,
          this.res,
        );

        if (!wasRemoved) {
          console.log(
            `⚠️ Cliente ${this.user.email} ya no estaba en ClientManager`,
          );
        }

        // 2. ✅ SIEMPRE remover de Redis cuando se desconecta
        const removedFromRedis = await this.redisService.removeUserFromQueue(
          this.queueId,
          this.user.id,
        );

        if (removedFromRedis) {
          console.log(
            `✅ Usuario ${this.user.email} eliminado de Redis correctamente`,
          );
        } else {
          console.log(`⚠️ Usuario ${this.user.email} ya no estaba en Redis`);
        }

        const remainingClients = this.clientManager.getClientCount(
          this.queueId,
        );
        console.log(
          `📊 Clientes restantes en cola ${this.queueId}: ${remainingClients}`,
        );
      } catch (error) {
        console.error(`❌ Error en cleanup para ${this.user.email}:`, error);
      }
    };

    // Manejar cierre de conexión
    this.req.on('close', () => executeCleanup('request close'));

    // Manejar errores de conexión
    this.req.on('error', (error) => {
      console.error(`❌ Error en request para ${this.user.email}:`, error);
      executeCleanup('request error');
    });

    // Manejar errores de respuesta
    this.res.on('error', (error) => {
      console.error(`❌ Error en response para ${this.user.email}:`, error);
      executeCleanup('response error');
    });

    // 🔧 Manejar finish de respuesta
    this.res.on('finish', () => executeCleanup('response finish'));
  }
}
