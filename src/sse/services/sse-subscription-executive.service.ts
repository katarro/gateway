// ============================================
// ARCHIVO: src/sse/services/sse-subscription-executive.service.ts
// ============================================

import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Subject,
  Observable,
  switchMap,
  catchError,
  of,
  map,
  filter,
} from 'rxjs';
import {
  QUEUE_UPDATE_EVENT,
  REDIS_SUB_CLIENT,
  TICKET_COMPLETED_EVENT,
} from 'src/config';
import { RedisService } from 'src/redis/redis.service';
import { Redis } from 'ioredis';
import { MessageEvent } from 'src/common/interfaces';
import { CHANNEL_MANAGER_TOKEN, IChannelManager } from '../interfaces';

@Injectable()
export class SseSubscriptionExecutiveService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly redisSubjects = new Map<string, Subject<any>>();
  private readonly subscribedChannels = new Set<string>();

  constructor(
    @Inject(REDIS_SUB_CLIENT) private readonly redisSubscriber: Redis,
    private readonly redisService: RedisService,
    @Inject(CHANNEL_MANAGER_TOKEN)
    private readonly channelManager: IChannelManager,
  ) {}

  // ✅ Configurar listener global al inicializar
  async onModuleInit() {
    this.redisSubscriber.on('message', (channel: string, message: string) => {
      this.handleRedisMessage(channel, message);
    });
    console.log('✅ SSE Subscription Service inicializado con listener global');
  }

  // ✅ Cleanup al destruir módulo
  async onModuleDestroy() {
    console.log('🧹 Cerrando SSE Subscription Service...');

    for (const channel of this.subscribedChannels) {
      await this.redisSubscriber.unsubscribe(channel);
    }

    this.redisSubjects.forEach((subject) => subject.complete());
    this.redisSubjects.clear();
    this.subscribedChannels.clear();

    console.log('✅ SSE Subscription Service cerrado');
  }

  // ✅ MÉTODO SEPARADO: Solo para conteo de usuarios en cola
  createQueueUpdateStream(queueId: string): Observable<MessageEvent> {
    const channel = `queue:${queueId}:executives`;

    console.log(
      `📊 Creando stream para conteo de usuarios en cola: ${queueId}`,
    );

    if (!this.redisSubjects.has(channel)) {
      this.subscribeToRedisChannel(channel);
    }

    const subject = this.redisSubjects.get(channel);

    return subject.pipe(
      // ✅ Solo procesar eventos de actualización de cola
      filter((redisData) => redisData.type === QUEUE_UPDATE_EVENT),
      switchMap(async (redisData) => {
        try {
          console.log(
            `🔄 Evento conteo: ${redisData.type} para cola ${queueId}`,
          );

          // ✅ Obtener conteo actualizado de usuarios
          const currentCount =
            await this.redisService.getUserCountInQueue(queueId);

          return {
            data: JSON.stringify({
              type: QUEUE_UPDATE_EVENT,
              queueId,
              clientsInQueue: currentCount,
              lastEvent: redisData.type,
              currentTicketNumber: redisData.currentTicketNumber || null,
              timestamp: new Date().toISOString(),
            }),
          } as MessageEvent;
        } catch (error) {
          console.error('❌ Error procesando evento de conteo:', error);
          return {
            data: JSON.stringify({
              type: 'ERROR',
              queueId,
              message: 'Error al obtener actualizaciones',
              timestamp: new Date().toISOString(),
            }),
          } as MessageEvent;
        }
      }),
      catchError((error) => {
        console.error('❌ Error en stream de conteo:', error);
        return of({
          data: JSON.stringify({
            type: 'ERROR',
            queueId,
            message: 'Error de conexión',
            timestamp: new Date().toISOString(),
          }),
        } as MessageEvent);
      }),
    );
  }

  // ✅ MÉTODO SEPARADO: Solo para tickets completados
  createCompletedTicketsStream(channel: string): Observable<MessageEvent> {
    console.log(`🎫 Creando stream para canal: ${channel}`);

    // ✅ Si no existe el subject, suscribirse automáticamente
    if (!this.redisSubjects.has(channel)) {
      this.subscribeToRedisChannel(channel); // ← Esto crea el subject Y se suscribe
    }

    const subject = this.redisSubjects.get(channel);

    if (!subject) {
      throw new Error(`No se pudo crear subject para canal: ${channel}`);
    }

    return subject.pipe(
      filter((redisData) => redisData.type === TICKET_COMPLETED_EVENT),
      map((redisData) => {
        console.log(`✅ Procesando ticket completado:`, {
          ticketId: redisData.ticket?.id,
          completedToday: redisData.completedToday,
        });

        // Es lo que le retorna al cliente
        return {
          data: JSON.stringify({
            type: TICKET_COMPLETED_EVENT,
            queueId: redisData.queueId,
            executiveId: redisData.executiveId, // ← Usar estas propiedades
            ticketId: redisData.ticketId, // ← que sí existen
            myCompletedToday: redisData.myCompletedToday, // ← en el payload
            ticket: redisData.ticket,
            completedToday: redisData.completedToday,
            timestamp: redisData.timestamp || new Date().toISOString(),
          }),
        } as MessageEvent;
      }),
      catchError((error) => {
        console.error('❌ Error en stream de tickets completados:', error);
        return of({
          data: JSON.stringify({
            type: 'ERROR',
            message: 'Error al recibir tickets completados',
            timestamp: new Date().toISOString(),
          }),
        } as MessageEvent);
      }),
    );
  }

  // En SseSubscriptionService, agregar:
  createUserEventsStream(userId: string): Observable<MessageEvent> {
    console.log(`👤 Creando stream para eventos de usuario: ${userId}`);

    const channel = `user:${userId}:events`;

    console.log(`👂 SSE escuchando canal: ${channel} para usuario: ${userId}`);

    // Reutilizar la misma lógica que ya tienes
    if (!this.redisSubjects.has(channel)) {
      this.subscribeToRedisChannel(channel);
    }

    const subject = this.redisSubjects.get(channel);
    if (!subject) {
      throw new Error(`No se pudo crear subject para canal: ${channel}`);
    }

    return subject.pipe(
      filter((redisData) =>
        [
          'TICKET_COMPLETED',
          'QUEUE_STATUS_UPDATE',
          'KEEPALIVE_USER',
          'UPDATE_REMAINING_TIME',
        ].includes(redisData.type),
      ),
      map(
        (redisData) =>
          ({
            data: JSON.stringify({
              ...redisData,
              timestamp: redisData.timestamp || new Date().toISOString(),
            }),
          }) as MessageEvent,
      ),
      catchError((error) => {
        console.error('❌ Error en stream de eventos de usuario:', error);
        return of({
          data: JSON.stringify({
            type: 'ERROR',
            message: 'Error al recibir eventos de usuario',
            timestamp: new Date().toISOString(),
          }),
        } as MessageEvent);
      }),
    );
  }

  // ✅ MÉTODO PRIVADO: Suscribirse a canal Redis
  private async subscribeToRedisChannel(channel: string): Promise<void> {
    if (this.subscribedChannels.has(channel)) {
      console.log(`⚠️ Ya suscrito a canal: ${channel}`);
      return;
    }

    try {
      // ✅ Crear Subject primero
      const subject = new Subject<any>();
      this.redisSubjects.set(channel, subject);

      // ✅ Suscribirse al canal
      await this.redisSubscriber.subscribe(channel);
      this.subscribedChannels.add(channel);

      console.log(`✅ Suscrito a canal Redis: ${channel}`);
    } catch (error) {
      console.error(`❌ Error suscribiéndose al canal ${channel}:`, error);
    }
  }

  // ✅ MÉTODO PRIVADO: Manejar mensajes de Redis
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const subject = this.redisSubjects.get(channel);

      if (subject) {
        subject.next(data);
        console.log(`📨 Mensaje procesado para canal ${channel}:`, {
          type: data.type,
          queueId: data.queueId,
          completedToday: data.completedToday,
          hasTicket: !!data.ticket,
        });
      } else {
        console.warn(`⚠️ No hay subject para canal: ${channel}`);
      }
    } catch (error) {
      console.error(
        `❌ Error procesando mensaje de Redis en canal ${channel}:`,
        error,
      );
    }
  }
}
