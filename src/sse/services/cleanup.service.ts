import { Injectable, Inject } from '@nestjs/common';
import {
  ICleanupService,
  IConnectionManager,
  ILogger,
  CONNECTION_MANAGER_TOKEN,
  LOGGER_TOKEN,
} from '../interfaces';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class CleanupService implements ICleanupService {
  constructor(
    @Inject(CONNECTION_MANAGER_TOKEN)
    private readonly connectionManager: IConnectionManager,
    private readonly redisService: RedisService,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async cleanupUser(queueId: string, userId: string): Promise<void> {
    try {
      this.logger.info(`Iniciando cleanup de usuario`, { queueId, userId });

      // 1. Buscar y cerrar conexión SSE del usuario
      const userConnection = this.connectionManager.findConnectionByUser(
        queueId,
        userId,
      );
      if (userConnection) {
        try {
          if (!userConnection.res.destroyed) {
            userConnection.res.end();
          }
          this.logger.debug(`Conexión SSE cerrada para usuario`, { userId });
        } catch (error) {
          this.logger.warn(`Error cerrando SSE (ya cerrada)`, {
            userId,
            error: error.message,
          });
        }

        // Remover del pool de conexiones
        this.connectionManager.removeConnection(queueId, userConnection.id);
      } else {
        this.logger.debug(`Usuario no encontrado en pool de conexiones`, {
          userId,
          queueId,
        });
      }

      // 2. Remover de Redis
      const removedFromRedis = await this.redisService.removeUserFromQueue(
        queueId,
        userId,
      );
      if (removedFromRedis) {
        this.logger.info(`Usuario eliminado de Redis`, { userId, queueId });
      } else {
        this.logger.debug(`Usuario no estaba en Redis`, { userId, queueId });
      }

      this.logger.info(`Cleanup de usuario completado`, { queueId, userId });
    } catch (error) {
      this.logger.error(`Error en cleanup de usuario`, error, {
        queueId,
        userId,
      });
      throw error;
    }
  }

  async cleanupQueue(queueId: string): Promise<void> {
    try {
      this.logger.info(`Iniciando cleanup de cola`, { queueId });

      // 1. Obtener todas las conexiones de la cola
      const connections = this.connectionManager.getConnections(queueId);

      // 2. Cerrar todas las conexiones SSE
      for (const connection of connections) {
        try {
          if (!connection.res.destroyed) {
            connection.res.end();
          }
          this.connectionManager.removeConnection(queueId, connection.id);
        } catch (error) {
          this.logger.warn(`Error cerrando conexión`, {
            userId: connection.user.id,
            error: error.message,
          });
        }
      }

      // 3. Limpiar Redis (obtener usuarios y eliminarlos)
      const usersInQueue = await this.redisService.getUsersInQueue(queueId);
      for (const userId of usersInQueue) {
        await this.redisService.removeUserFromQueue(queueId, userId);
      }

      this.logger.info(`Cleanup de cola completado`, {
        queueId,
        connectionsRemoved: connections.length,
        usersRemovedFromRedis: usersInQueue.length,
      });
    } catch (error) {
      this.logger.error(`Error en cleanup de cola`, error, { queueId });
      throw error;
    }
  }

  async cleanupDisconnectedClients(): Promise<number> {
    try {
      const activeQueues = this.connectionManager.getAllActiveQueues();
      let totalCleaned = 0;

      for (const queueId of activeQueues) {
        const connections = this.connectionManager.getConnections(queueId);
        const deadConnections: string[] = [];

        // Detectar conexiones muertas
        for (const connection of connections) {
          if (
            connection.res.destroyed ||
            connection.res.writableEnded ||
            !connection.res.writable
          ) {
            deadConnections.push(connection.id);

            // También limpiar de Redis
            await this.redisService.removeUserFromQueue(
              queueId,
              connection.user.id,
            );
          }
        }

        // Remover del pool de conexiones
        for (const connectionId of deadConnections) {
          this.connectionManager.removeConnection(queueId, connectionId);
        }

        totalCleaned += deadConnections.length;

        if (deadConnections.length > 0) {
          this.logger.info(`Conexiones muertas limpiadas en cola`, {
            queueId,
            count: deadConnections.length,
          });
        }
      }

      if (totalCleaned > 0) {
        this.logger.info(`Cleanup automático completado`, { totalCleaned });
      }

      return totalCleaned;
    } catch (error) {
      this.logger.error(`Error en cleanup automático`, error);
      return 0;
    }
  }
}
