// ============================================
// ARCHIVO: src/redis/event-notification.service.ts
// ============================================

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  QUEUE_UPDATE_EVENT,
  REDIS_PUB_CLIENT,
  TICKET_CALLED_EVENT,
  TICKET_COMPLETED_EVENT,
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

  // ✅ Publicar evento de ticket completado
  async publishEventCompleteTicket(ticket: any) {
    const queueId = ticket?.data?.queueId;

    if (!queueId) {
      console.error('❌ No se puede publicar ticket completado sin queueId');
      return;
    }

    try {
      // ✅ 1. GUARDAR ticket completado en Redis
      await this.redisService.addCompletedTicket(queueId, ticket.data);

      // ✅ 2. OBTENER cantidad actualizada desde Redis
      const completedCount =
        await this.redisService.getCompletedTicketsCountToday(queueId);

      // ✅ 3. PUBLICAR evento con cantidad real desde Redis
      await this.redis.publish(
        `queue:${queueId}:executives`,
        JSON.stringify({
          type: TICKET_COMPLETED_EVENT,
          queueId,
          ticket: ticket.data,
          completedToday: completedCount, // ✅ Conteo real desde Redis
          timestamp: new Date(),
        }),
      );

      console.log(
        `🎉 Evento ticket completado publicado para cola ${queueId}`,
        {
          ticketId: ticket.data?.id,
          ticketNumber: ticket.data?.ticketNumber,
          completedToday: completedCount,
        },
      );

      // ✅ 4. También actualizar conteo de usuarios en cola
      await this.publishEventUpdateCountInQueue(queueId);
    } catch (error) {
      console.error('❌ Error publicando evento de ticket completado:', error);
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
}
