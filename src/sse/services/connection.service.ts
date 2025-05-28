import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  IConnectionManager,
  ILogger,
  IMetricsCollector,
  SseClient,
  LOGGER_TOKEN,
  METRICS_COLLECTOR_TOKEN,
} from '../interfaces';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ConnectionService
  implements IConnectionManager, OnModuleInit, OnModuleDestroy
{
  private readonly connections = new Map<string, Map<string, SseClient>>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    @Inject(METRICS_COLLECTOR_TOKEN)
    private readonly metrics: IMetricsCollector,
    private readonly redisService: RedisService, // ✅ Agregar Redis para cleanup
  ) {}

  async onModuleInit() {
    // 💓 Iniciar heartbeat cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    this.logger.info('ConnectionService inicializado con heartbeat');
  }

  async onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null; // ✅ Limpiar referencia
    }

    // ✅ Limpiar todas las conexiones
    this.connections.clear();

    this.logger.info('ConnectionService destruido');
  }

  addConnection(queueId: string, client: SseClient): void {
    let queueConnections = this.connections.get(queueId);
    if (!queueConnections) {
      queueConnections = new Map<string, SseClient>();
      this.connections.set(queueId, queueConnections);
    }

    queueConnections.set(client.id, client);

    this.logger.info(`Cliente agregado a cola`, {
      email: client.user.email,
      queueId,
      clientId: client.id,
      total: queueConnections.size,
    });

    this.metrics.incrementConnection(queueId);
  }

  removeConnection(queueId: string, clientId: string): boolean {
    const queueConnections = this.connections.get(queueId);
    if (!queueConnections) return false;

    const client = queueConnections.get(clientId);
    if (!client) return false;

    queueConnections.delete(clientId);

    if (queueConnections.size === 0) {
      this.connections.delete(queueId);
      this.logger.info(`Cola eliminada (sin clientes)`, { queueId });
    }

    this.logger.info(`Cliente desconectado`, {
      email: client.user.email,
      queueId,
      clientId,
      remaining: queueConnections.size,
    });

    this.metrics.decrementConnection(queueId);
    return true;
  }

  getConnections(queueId: string): SseClient[] {
    const queueConnections = this.connections.get(queueId);
    return queueConnections ? Array.from(queueConnections.values()) : [];
  }

  getConnectionCount(queueId: string): number {
    const queueConnections = this.connections.get(queueId);
    return queueConnections ? queueConnections.size : 0;
  }

  findConnectionByUser(queueId: string, userId: string): SseClient | undefined {
    const connections = this.getConnections(queueId);
    return connections.find((client) => client.user.id === userId);
  }

  getAllActiveQueues(): string[] {
    return Array.from(this.connections.keys());
  }

  getTotalConnections(): number {
    let total = 0;
    for (const queueConnections of this.connections.values()) {
      total += queueConnections.size;
    }
    return total;
  }

  getDetailedStats() {
    const stats = {
      totalQueues: this.connections.size,
      totalConnections: this.getTotalConnections(),
      queues: [] as any[],
    };

    for (const [queueId, queueConnections] of this.connections.entries()) {
      stats.queues.push({
        queueId,
        connectionCount: queueConnections.size,
        clients: Array.from(queueConnections.values()).map((client) => ({
          id: client.id,
          userId: client.user.id,
          email: client.user.email,
          connectedAt: client.connectedAt,
          lastHeartbeat: client.lastHeartbeat,
        })),
      });
    }

    return stats;
  }

  // 💓 Heartbeat INDEPENDIENTE con limpieza de Redis
  private async sendHeartbeat(): Promise<void> {
    const activeQueues = this.getAllActiveQueues();

    // ✅ Log siempre para ver que funciona
    this.logger.info(`💓 Iniciando heartbeat`, {
      totalQueues: activeQueues.length,
      totalConnections: this.getTotalConnections(),
    });

    if (activeQueues.length === 0) {
      this.logger.info(`💓 Heartbeat: No hay colas activas`);
      return;
    }

    let totalAlive = 0;
    let totalDead = 0;
    const queuesWithDeadClients: string[] = [];

    // Enviar heartbeat directamente a cada cliente
    for (const [queueId, queueConnections] of this.connections.entries()) {
      const deadClients: { clientId: string; userId: string }[] = [];

      for (const [clientId, client] of queueConnections.entries()) {
        if (this.sendHeartbeatToClient(client)) {
          totalAlive++;
        } else {
          deadClients.push({ clientId, userId: client.user.id });
          totalDead++;
        }
      }

      // Limpiar clientes muertos
      if (deadClients.length > 0) {
        await this.cleanupDeadClientsInQueue(queueId, deadClients);
        queuesWithDeadClients.push(queueId);
      }
    }

    // ✅ Log del resultado
    if (totalAlive > 0 || totalDead > 0) {
      this.logger.info(`💓 Heartbeat completado`, {
        totalAlive,
        totalDead,
        queuesWithDeadClients,
        activeQueuesAfter: this.getAllActiveQueues().length,
      });
    }

    // 🧹 Limpiar colas vacías en Redis
    if (queuesWithDeadClients.length > 0) {
      await this.cleanupEmptyQueuesInRedis();
    }
  }

  // 🧹 Limpiar clientes muertos de una cola específica
  private async cleanupDeadClientsInQueue(
    queueId: string,
    deadClients: { clientId: string; userId: string }[],
  ): Promise<void> {
    this.logger.info(
      `🧹 Limpiando ${deadClients.length} clientes muertos en cola ${queueId}`,
    );

    for (const { clientId, userId } of deadClients) {
      // 1. Remover del ConnectionManager
      this.removeConnection(queueId, clientId);

      // 2. ✅ Remover de Redis
      try {
        await this.redisService.removeUserFromQueue(queueId, userId);
        this.logger.debug(
          `✅ Usuario ${userId} eliminado de Redis en cola ${queueId}`,
        );
      } catch (error) {
        this.logger.error(`❌ Error eliminando usuario de Redis`, error, {
          queueId,
          userId,
        });
      }
    }
  }

  // 🗑️ Limpiar colas completamente vacías de Redis
  private async cleanupEmptyQueuesInRedis(): Promise<void> {
    try {
      const emptyQueues = await this.redisService.cleanupEmptyQueues();

      if (emptyQueues.length > 0) {
        this.logger.info(`🗑️ Colas vacías eliminadas de Redis`, {
          emptyQueues: emptyQueues.length,
          queueIds: emptyQueues,
        });
      }
    } catch (error) {
      this.logger.error(`❌ Error limpiando colas vacías en Redis`, error);
    }
  }

  // 🔧 Enviar heartbeat a un cliente específico
  private sendHeartbeatToClient(client: SseClient): boolean {
    try {
      // Verificar si la conexión está viva
      if (
        client.res.destroyed ||
        client.res.writableEnded ||
        !client.res.writable
      ) {
        this.logger.info(`💀 Cliente muerto detectado por heartbeat`, {
          clientId: client.id,
          email: client.user.email,
          connectionAge: Date.now() - client.connectedAt.getTime(),
        });
        return false;
      }

      // Enviar heartbeat simple
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      };

      client.res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`);
      client.lastHeartbeat = new Date();

      return true;
    } catch (error) {
      this.logger.info(`💀 Cliente con error detectado por heartbeat`, {
        clientId: client.id,
        email: client.user.email,
        error: error.message,
      });
      return false;
    }
  }
}
