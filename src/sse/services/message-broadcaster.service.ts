import { Injectable, Inject } from '@nestjs/common';
import {
  IMessageBroadcaster,
  IConnectionManager,
  ILogger,
  IMetricsCollector,
  SseClient,
  CONNECTION_MANAGER_TOKEN,
  LOGGER_TOKEN,
  METRICS_COLLECTOR_TOKEN,
} from '../interfaces';

@Injectable()
export class MessageBroadcasterService implements IMessageBroadcaster {
  constructor(
    @Inject(CONNECTION_MANAGER_TOKEN)
    private readonly connectionManager: IConnectionManager,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    @Inject(METRICS_COLLECTOR_TOKEN)
    private readonly metrics: IMetricsCollector,
  ) {}

  async broadcastToQueue(queueId: string, message: any): Promise<void> {
    const connections = this.connectionManager.getConnections(queueId);

    // 🔍 DEBUG: Log detallado del estado
    this.logger.info('Broadcasting - Estado detallado', {
      queueId,
      connectionsFound: connections.length,
      messageType: message.type,
      allActiveQueues: this.connectionManager.getAllActiveQueues(),
      totalConnections: this.connectionManager.getTotalConnections(),
    });

    if (connections.length === 0) {
      this.logger.warn(`No hay clientes conectados a la cola`, {
        queueId,
        allActiveQueues: this.connectionManager.getAllActiveQueues(),
        totalGlobalConnections: this.connectionManager.getTotalConnections(),
      });
      return;
    }

    this.logger.info(`Enviando mensaje a cola`, {
      queueId,
      clientCount: connections.length,
      messageType: message.type,
    });

    const formattedMessage = this.formatMessage(message);
    const deadConnections: string[] = [];
    let successfulSends = 0;

    for (const connection of connections) {
      const success = await this.sendToConnection(connection, formattedMessage);
      if (success) {
        successfulSends++;
      } else {
        deadConnections.push(connection.id);
      }
    }

    await this.cleanupDeadConnections(queueId, deadConnections);

    this.logger.info(`Broadcast completado`, {
      queueId,
      successful: successfulSends,
      failed: deadConnections.length,
      remaining: connections.length - deadConnections.length,
    });

    this.metrics.recordMessageSent(queueId);
  }

  async broadcastToUser(
    userId: string,
    queueId: string,
    message: any,
  ): Promise<void> {
    const connection = this.connectionManager.findConnectionByUser(
      queueId,
      userId,
    );

    if (!connection) {
      this.logger.debug(`Usuario no encontrado en cola`, { userId, queueId });
      return;
    }

    const formattedMessage = this.formatMessage(message);
    const success = await this.sendToConnection(connection, formattedMessage);

    if (!success) {
      await this.cleanupDeadConnections(queueId, [connection.id]);
      this.logger.warn(`Conexión muerta detectada para usuario`, {
        userId,
        queueId,
      });
    } else {
      this.logger.info(`Mensaje enviado a usuario`, {
        userId,
        queueId,
        messageType: message.type,
      });
    }
  }

  async broadcastHeartbeat(): Promise<void> {
    const activeQueues = this.connectionManager.getAllActiveQueues();
    const heartbeatMessage = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    };

    for (const queueId of activeQueues) {
      await this.broadcastToQueue(queueId, heartbeatMessage);
    }
  }

  async broadcastSystemMessage(
    message: string,
    type: 'info' | 'warning' | 'error' = 'info',
  ): Promise<void> {
    const activeQueues = this.connectionManager.getAllActiveQueues();
    const systemMessage = {
      type: 'system_message',
      level: type,
      message,
    };

    for (const queueId of activeQueues) {
      await this.broadcastToQueue(queueId, systemMessage);
    }
  }

  private formatMessage(message: any): string {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };
    return `data: ${JSON.stringify(messageWithTimestamp)}\n\n`;
  }

  private async sendToConnection(
    connection: SseClient,
    formattedMessage: string,
  ): Promise<boolean> {
    try {
      if (
        connection.res.destroyed ||
        connection.res.writableEnded ||
        !connection.res.writable
      ) {
        this.logger.debug(`Conexión ya cerrada`, {
          userId: connection.user.id,
          email: connection.user.email,
        });
        return false;
      }

      connection.res.write(formattedMessage);
      connection.lastHeartbeat = new Date();

      this.logger.debug(`Mensaje enviado exitosamente`, {
        email: connection.user.email,
      });
      return true;
    } catch (error) {
      this.logger.error(`Error enviando mensaje SSE`, error, {
        email: connection.user.email,
      });
      this.metrics.recordError('sse_send', error);
      return false;
    }
  }

  private async cleanupDeadConnections(
    queueId: string,
    deadConnectionIds: string[],
  ): Promise<void> {
    for (const connectionId of deadConnectionIds) {
      this.connectionManager.removeConnection(queueId, connectionId);
    }

    if (deadConnectionIds.length > 0) {
      this.logger.info(`Conexiones muertas limpiadas`, {
        queueId,
        count: deadConnectionIds.length,
      });
    }
  }
}
