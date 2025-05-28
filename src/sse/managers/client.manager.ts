// managers/client.manager.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';

interface SseClient {
  res: Response;
  user: CurrentUser;
  connectedAt: Date;
  lastHeartbeat?: Date;
}

@Injectable()
export class ClientManager implements OnModuleInit, OnModuleDestroy {
  private readonly clients = new Map<string, Set<SseClient>>();
  private heartbeatInterval: NodeJS.Timeout;

  onModuleInit() {
    // 🔧 Iniciar heartbeat cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    console.log('✅ ClientManager inicializado con heartbeat');
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    console.log('🛑 ClientManager destruido');
  }

  /**
   * ➕ Agregar cliente a cola
   */
  addClient(queueId: string, client: Omit<SseClient, 'connectedAt'>): void {
    let queueClients = this.clients.get(queueId);

    if (!queueClients) {
      queueClients = new Set<SseClient>();
      this.clients.set(queueId, queueClients);
    }

    const sseClient: SseClient = {
      ...client,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    queueClients.add(sseClient);

    console.log(
      `✅ Cliente ${client.user.email} agregado a cola ${queueId}. Total: ${queueClients.size}`,
    );
  }

  /**
   * ❌ Remover cliente de cola
   */
  removeClient(queueId: string, res: Response): boolean {
    const queueClients = this.clients.get(queueId);
    if (!queueClients) return false;

    let removed = false;
    for (const client of queueClients) {
      if (client.res === res) {
        queueClients.delete(client);
        removed = true;
        console.log(
          `❌ Cliente ${client.user.email} desconectado de cola ${queueId}. Total: ${queueClients.size}`,
        );
        break;
      }
    }

    // Limpiar cola vacía
    if (queueClients.size === 0) {
      this.clients.delete(queueId);
      console.log(`🧹 Cola ${queueId} eliminada (sin clientes)`);
    }

    return removed;
  }

  /**
   * 🔍 Obtener clientes de una cola
   */
  getClients(queueId: string): Set<SseClient> | undefined {
    return this.clients.get(queueId);
  }

  /**
   * 🔢 Contar clientes en una cola
   */
  getClientCount(queueId: string): number {
    const clients = this.clients.get(queueId);
    return clients ? clients.size : 0;
  }

  /**
   * 📊 Obtener todas las colas activas
   */
  getAllQueues(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * 👤 Obtener cliente específico por usuario
   */
  getClientByUser(queueId: string, userId: string): SseClient | undefined {
    const queueClients = this.clients.get(queueId);
    if (!queueClients) return undefined;

    for (const client of queueClients) {
      if (client.user.id === userId) {
        return client;
      }
    }
    return undefined;
  }

  /**
   * ❤️ Enviar heartbeat a todos los clientes
   */
  private sendHeartbeat(): void {
    const now = new Date();
    let totalClients = 0;
    let deadClients = 0;

    for (const [queueId, queueClients] of this.clients.entries()) {
      const clientsToRemove = new Set<SseClient>();

      for (const client of queueClients) {
        totalClients++;

        try {
          if (client.res.destroyed || client.res.writableEnded) {
            clientsToRemove.add(client);
            continue;
          }

          // Enviar ping
          const heartbeatData = {
            type: 'heartbeat',
            timestamp: now.toISOString(),
            queueId: queueId,
          };

          client.res.write(`data: ${JSON.stringify(heartbeatData)}\n\n`);
          client.lastHeartbeat = now;
        } catch (error) {
          console.error(
            `💀 Cliente muerto detectado: ${client.user.email}`,
            error,
          );
          clientsToRemove.add(client);
        }
      }

      // Remover clientes muertos
      for (const deadClient of clientsToRemove) {
        queueClients.delete(deadClient);
        deadClients++;
      }

      // Limpiar colas vacías
      if (queueClients.size === 0) {
        this.clients.delete(queueId);
      }
    }

    if (totalClients > 0) {
      console.log(
        `❤️ Heartbeat enviado. Activos: ${totalClients - deadClients}, Eliminados: ${deadClients}`,
      );
    }
  }

  /**
   * 🧹 Limpiar clientes desconectados manualmente
   */
  cleanupDisconnectedClients(): number {
    let cleanedCount = 0;

    for (const [queueId, queueClients] of this.clients.entries()) {
      const clientsToRemove = new Set<SseClient>();

      for (const client of queueClients) {
        if (client.res.destroyed || client.res.writableEnded) {
          clientsToRemove.add(client);
        }
      }

      for (const deadClient of clientsToRemove) {
        queueClients.delete(deadClient);
        cleanedCount++;
      }

      if (queueClients.size === 0) {
        this.clients.delete(queueId);
      }
    }

    return cleanedCount;
  }

  /**
   * 📈 Obtener estadísticas detalladas
   */
  getDetailedStats(): any {
    const stats = {
      totalQueues: this.clients.size,
      totalClients: 0,
      queues: [] as any[],
    };

    for (const [queueId, queueClients] of this.clients.entries()) {
      const queueStats = {
        queueId,
        clientCount: queueClients.size,
        clients: Array.from(queueClients).map((client) => ({
          userId: client.user.id,
          email: client.user.email,
          connectedAt: client.connectedAt,
          lastHeartbeat: client.lastHeartbeat,
        })),
      };

      stats.queues.push(queueStats);
      stats.totalClients += queueClients.size;
    }

    return stats;
  }
}
