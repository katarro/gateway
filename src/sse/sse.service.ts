import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import { REDIS_SUB_CLIENT, TICKET_CALLED_EVENT } from 'src/config';
import { RedisService } from 'src/redis/redis.service';
import { Redis } from 'ioredis';
import { SubscribeToQueueCommand } from './command/subscribe-to-queue.command';
import { ClientManager } from './managers/client.manager';

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly subscribedChannels = new Set<string>();
  private readonly messageHandler: (channel: string, message: string) => void;
  private isInitialized = false;

  constructor(
    @Inject(REDIS_SUB_CLIENT) private readonly redis: Redis,
    private readonly redisService: RedisService,
    private readonly clientManager: ClientManager,
    private readonly subscribeCommand: SubscribeToQueueCommand,
  ) {
    // 🔧 Definir handler una sola vez para evitar memory leaks
    this.messageHandler = this.handleRedisMessage.bind(this);
  }

  async onModuleInit() {
    if (this.isInitialized) {
      console.log('⚠️ SseService ya está inicializado');
      return;
    }

    console.log('🚀 Inicializando SseService...');

    // 1. ✅ Registrar listener UNA SOLA VEZ al inicio
    this.redis.on('message', this.messageHandler);
    console.log('📡 Listener de Redis registrado');

    this.isInitialized = true;
    console.log('✅ SseService inicializado correctamente');
  }

  async onModuleDestroy() {
    console.log('🛑 Cerrando SseService...');

    // Limpiar listeners
    this.redis.off('message', this.messageHandler);

    // Desuscribirse de todos los canales
    if (this.subscribedChannels.size > 0) {
      const channels = Array.from(this.subscribedChannels);
      await this.redis.unsubscribe(...channels);
      this.subscribedChannels.clear();
    }

    this.isInitialized = false;
  }

  /**
   * 🔧 Asegurar suscripción a canal (sin duplicados)
   */
  private async ensureChannelSubscription(queueId: string): Promise<void> {
    const channel = `queue:${queueId}`;

    if (this.subscribedChannels.has(channel)) {
      console.log(`⚡ Ya suscrito a canal: ${channel}`);
      return;
    }

    try {
      await this.redis.subscribe(channel);
      this.subscribedChannels.add(channel);
      console.log(`📡 Suscrito a nuevo canal: ${channel}`);
    } catch (error) {
      console.error(`❌ Error suscribiéndose a ${channel}:`, error);
    }
  }

  /**
   * 📨 Manejar mensajes de Redis - UNA SOLA VEZ
   */
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const queueId = channel.split(':')[1];

      console.log(`📨 [ÚNICO] Mensaje Redis en ${channel}:`, data);
      this.broadcastToQueue(queueId, data);
    } catch (err) {
      console.error('💥 Error procesando mensaje Redis:', err);
    }
  }

  /**
   * 👤 Suscribir usuario a cola SSE
   */
  async subscribeToQueue(
    queueId: string,
    res: Response,
    req: Request,
    user: CurrentUser,
    body: any,
  ): Promise<void> {
    console.log(`🔗 Suscribiendo ${user.email} a cola ${queueId}`);

    // 1. Asegurar suscripción a Redis para esta cola
    await this.ensureChannelSubscription(queueId);

    // 2. Configurar y ejecutar comando
    await this.subscribeCommand
      .configure(queueId, res, req, user, body)
      .execute();
  }

  /**
   * 📢 Broadcast de ticket llamado
   */
  public broadcastTicketCalled(queueId: string, ticketNumber: number): void {
    const data = {
      type: TICKET_CALLED_EVENT,
      queueId,
      currentTicketNumber: ticketNumber,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToQueue(queueId, data);
  }

  /**
   * 📡 Enviar mensaje a todos los clientes de una cola
   */
  private broadcastToQueue(queueId: string, data: any): void {
    const queueClients = this.clientManager.getClients(queueId);

    if (!queueClients || queueClients.size === 0) {
      console.log(`📭 No hay clientes conectados a la cola ${queueId}`);
      return;
    }

    console.log(
      `📡 Enviando mensaje a ${queueClients.size} clientes en cola ${queueId}`,
    );
    console.log(`📨 Datos a enviar:`, data);

    const message = `data: ${JSON.stringify(data)}\n\n`;
    const deadClients = new Set<Response>();
    let successfulSends = 0;

    // Enviar mensaje a todos los clientes
    for (const client of queueClients) {
      try {
        // 🔧 Verificación más robusta del estado de la conexión
        if (
          client.res.destroyed ||
          client.res.writableEnded ||
          !client.res.writable
        ) {
          console.log(`💀 Cliente ${client.user.email} ya está desconectado`);
          deadClients.add(client.res);
          continue;
        }

        client.res.write(message);
        successfulSends++;
        console.log(`✅ Mensaje enviado a ${client.user.email}`);
      } catch (error) {
        console.error(`💀 Error enviando SSE a ${client.user.email}:`, error);
        deadClients.add(client.res);
      }
    }

    // Limpiar clientes desconectados
    for (const deadClient of deadClients) {
      this.clientManager.removeClient(queueId, deadClient);
    }

    const remainingClients = this.clientManager.getClientCount(queueId);
    console.log(
      `✅ Mensaje enviado exitosamente a ${successfulSends} clientes. Restantes: ${remainingClients}`,
    );
  }

  /**
   * 📊 Obtener estadísticas
   */
  public getStats(): any {
    const allQueues = this.clientManager.getAllQueues();
    const stats = {
      totalQueues: allQueues.length,
      subscribedChannels: this.subscribedChannels.size,
      channelsList: Array.from(this.subscribedChannels),
      queues: allQueues.map((queueId) => ({
        queueId,
        clients: this.clientManager.getClientCount(queueId),
      })),
    };

    return stats;
  }
}
