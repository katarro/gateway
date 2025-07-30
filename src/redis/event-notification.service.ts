// ============================================
// ARCHIVO: src/redis/event-notification.service.ts
// ============================================

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  QUEUE_UPDATE_EVENT,
  REDIS_PUB_CLIENT,
  TICKET_CALLED_EVENT,
} from 'src/config';
import { RedisService } from './redis.service';

@Injectable()
export class EventNotificationService {
  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly redis: Redis,
    private readonly redisService: RedisService,
  ) {}

  // ✅ Publicar evento de ticket actual llamado
  async publishEventUpdateCurrentTicket(ticketNumber: number, queueId: string) {
    // ✅ Guardar el ticket actual en Redis
    await this.redis.set(`queue:${queueId}:current`, ticketNumber.toString());

    // ✅ Publicar evento a clientes esperando
    await this.redis.publish(
      `queue:${queueId}`,
      JSON.stringify({
        type: TICKET_CALLED_EVENT,
        queueId,
        currentTicketNumber: ticketNumber,
        timestamp: new Date(),
      }),
    );

    console.log(`📢 Ticket ${ticketNumber} llamado para cola ${queueId}`);
  }

  // ✅ Publicar actualización de conteo de usuarios en cola
  async publishEventUpdateCountInQueue(queueId: string) {
    // ✅ Contar usuarios reales en la cola (no tickets)
    const userCount = await this.redisService.getUserCountInQueue(queueId);

    await this.redis.publish(
      `queue:${queueId}:executives`,
      JSON.stringify({
        type: QUEUE_UPDATE_EVENT,
        queueId,
        clientsInQueue: userCount,
        timestamp: new Date(),
      }),
    );

    console.log(
      `📊 Actualización conteo publicada para cola ${queueId}: ${userCount} usuarios`,
    );
  }

  // Funcion para publicar un evento
  async publishEvent<T>(
    channel: string,
    eventType: string,
    payload: T,
  ): Promise<void> {
    try {
      const message = {
        type: eventType,
        ...payload,
      };

      await this.redis.publish(channel, JSON.stringify(message));
      console.log(`✅ EVENTO PUBLICADO EN REDIS:`, { channel, message });
    } catch (error) {
      console.error(
        `Error publicando evento ${eventType} en canal ${channel}`,
        error,
      );
      throw error;
    }
  }

  // ✅ Obtener estadísticas en tiempo real
  async getQueueStats(queueId: string) {
    const userCount = await this.redisService.getUserCountInQueue(queueId);
    const currentTicket = await this.redis.get(`queue:${queueId}:current`);
    const completedToday =
      await this.redisService.getCompletedTicketsCountToday(queueId);

    return {
      queueId,
      usersInQueue: userCount,
      currentTicketNumber: currentTicket ? parseInt(currentTicket, 10) : null,
      completedToday,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎯 MÉTODO CENTRALIZADO: Desuscribir cliente de cola y notificar finalización
   * Reutilizable para COMPLETED, ABSENT, CANCELLED, etc.
   */
  async unsubscribeClientFromQueueAndNotify(
    queueId: string,
    ticketId: string,
    clientUserId: string,
    status: 'COMPLETED' | 'ABSENT' | 'CANCELLED',
    executiveId?: string,
  ): Promise<void> {
    try {
      console.log(
        `🔌 Desuscribiendo cliente ${clientUserId} de cola ${queueId} - Status: ${status}`,
      );

      // 1. 🗑️ REMOVER USUARIO DE LA COLA DE REDIS
      const wasRemoved = await this.redisService.removeUserFromQueue(
        queueId,
        clientUserId,
      );
      console.log(
        `🗑️ Cliente ${clientUserId} desuscrito de cola: ${wasRemoved}`,
      );

      // 2. 📤 EVENTO PARA EL CLIENTE ESPECÍFICO
      const clientChannel = `user:${clientUserId}:events`;
      await this.publishEvent(clientChannel, 'TICKET_COMPLETED', {
        ticketId,
        queueId,
        status,
        completedAt: new Date().toISOString(),
        executiveId,
      });

      // 3. 📊 EVENTO GENERAL PARA LA COLA
      const queueChannel = `queue:${queueId}`;
      await this.publishEvent(queueChannel, 'QUEUE_STATUS_UPDATE', {
        queueId,
        ticketCompleted: ticketId,
        status,
        currentTicketNumber: await this.redis.get(`queue:${queueId}:current`),
        timestamp: new Date().toISOString(),
      });

      // 4. 🔄 ACTUALIZAR CONTEO DE COLA (automáticamente correcto)
      await this.publishEventUpdateCountInQueue(queueId);

      console.log(
        `✅ Cliente ${clientUserId} desuscrito y notificado - Ticket ${ticketId} ${status}`,
      );
    } catch (error) {
      console.error(`❌ Error desuscribiendo cliente de cola:`, error);
      throw error;
    }
  }
}
/*


const queueId = 'bd51dc67-9ea2-406e-98e9-b89d29431fe4';        
const executiveId = '535c073a-f74e-4156-a700-bf686544ff01';    

const eventSource = new EventSource(`http://192.168.1.89:3000/api/eventos-cola/ejecutivo/tickets-completados/${queueId}/${executiveId}`);
// ✅ Escuchar eventos de tickets completados
eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('🎫 Ticket completado recibido:', data);
    
    if (data.type === 'TICKET_COMPLETED_EVENT') {
        console.log(`✅ Ejecutivo ${data.executiveId} completó ticket ${data.ticketId}`);
        console.log(`📊 Total completados hoy: ${data.myCompletedToday}`);
    }
};

eventSource.onopen = function(event) {
    console.log('🚀 Conexión SSE abierta');
};

eventSource.onerror = function(event) {
    console.error('❌ Error SSE:', event);
    console.log('Estado:', eventSource.readyState);
};

// También agrega listener genérico:
eventSource.addEventListener('TICKET_COMPLETED_EVENT', function(event) {
    console.log('📨 Evento específico recibido:', event.data);
});

*/
