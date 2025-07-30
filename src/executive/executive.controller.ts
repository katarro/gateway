import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'src/auth/enums';
import { User } from 'src/auth/decorators';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { catchError, firstValueFrom, tap, throwError } from 'rxjs';
import {
  NATS_SERVICES,
  REDIS_PUB_CLIENT,
  TICKET_COMPLETED_EVENT,
} from 'src/config';
import { EventNotificationService } from '../redis/event-notification.service';
import { RedisService } from 'src/redis/redis.service';
import { Redis } from 'ioredis';
import { ChannelService } from 'src/sse/services/channel.service';

@Controller('ejecutivo')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.EXECUTIVE)
export class ExecutiveController {
  constructor(
    @Inject(NATS_SERVICES) private readonly client: ClientProxy,
    @Inject(REDIS_PUB_CLIENT) private readonly redis: Redis,
    private readonly eventNotificationService: EventNotificationService,
    private readonly redisService: RedisService,
  ) {}
  // ✅✅✅✅ Obtener ticket actual del módulo asignado
  @Get('tickets/actual')
  async getCurrentTicket(@User() user: any) {
    return this.sendMessage('executive.getCurrentTicket', { userId: user.id });
  }

  // ✅✅✅✅ Llamar al siguiente (avanza la cola y emite evento)
  @Post('tickets/llamar-siguiente')
  async callNextTicket(@User() user: any) {
    const result = await this.sendMessage('executive.callNextTicket', {
      userId: user.id,
    });

    const ticketNumber = result?.ticket?.ticketNumber;
    const queueId = result?.queueId;

    if (ticketNumber && queueId) {
      await this.eventNotificationService.publishEventUpdateCurrentTicket(
        ticketNumber,
        queueId,
      );

      await this.eventNotificationService.publishEventUpdateCountInQueue(
        queueId,
      );
    }

    return result;
  }

  @Post('tickets/:id/completar')
  async completeTicket(@Param('id') id: string, @User() user: any) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    console.log(
      `🟡 [GATEWAY-${requestId}] [${timestamp}] ===== REQUEST INICIADO =====`,
    );
    console.log(`🟡 [GATEWAY-${requestId}] Ticket: ${id}, Usuario: ${user.id}`);
    console.log(`🟡 [GATEWAY-${requestId}] Start time: ${startTime}`);

    let ticket: any;
    try {
      console.log(`🟡 [GATEWAY-${requestId}] Enviando a microservicio...`);

      ticket = await this.sendMessage('executive.completeTicket', {
        ticketId: id,
        userId: user.id,
      });

      console.log('🟢 [GATEWAY] RESPONSE:', JSON.stringify(ticket, null, 2));

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `🟢 [GATEWAY-${requestId}] [${new Date().toISOString()}] ===== REQUEST EXITOSO =====`,
      );
      console.log(`🟢 [GATEWAY-${requestId}] Duración: ${duration}ms`);
      console.log(
        `🟢 [GATEWAY-${requestId}] Response recibida del microservicio:`,
        JSON.stringify(ticket, null, 2),
      );
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.error(
        `🔴 [GATEWAY-${requestId}] [${new Date().toISOString()}] ===== REQUEST FALLÓ =====`,
      );
      console.error(`🔴 [GATEWAY-${requestId}] Duración: ${duration}ms`);
      console.error(
        `🔴 [GATEWAY-${requestId}] Error recibido del microservicio:`,
        error,
      );
      console.error(
        `🔴 [GATEWAY-${requestId}] Error message:`,
        error.response?.message || error.message,
      );

      throw error;
    }

    // Si llegamos aquí, el ticket se procesó correctamente
    const ticketData = ticket?.data;

    if (!ticketData) {
      console.warn(
        `⚠️ [GATEWAY-${requestId}] No se recibieron datos del ticket`,
      );
      const finalEndTime = Date.now();
      const totalDuration = finalEndTime - startTime;
      console.log(
        `🟡 [GATEWAY-${requestId}] PROCESO COMPLETO (sin datos): ${totalDuration}ms`,
      );
      return ticket;
    }

    // Para ticketHistory, los campos son diferentes:
    const {
      status: ticketStatus,
      queueId,
      userId: clientUserId,
      originalId, // Este es el ID original del ticket
    } = ticketData;

    // Log explícito de variables relevantes
    console.log(`🟢 [GATEWAY-${requestId}] Datos extraídos del ticket:`);
    console.log(`🟢 [GATEWAY-${requestId}]   - ticketStatus: ${ticketStatus}`);
    console.log(`🟢 [GATEWAY-${requestId}]   - queueId: ${queueId}`);
    console.log(`🟢 [GATEWAY-${requestId}]   - clientUserId: ${clientUserId}`);
    console.log(`🟢 [GATEWAY-${requestId}]   - originalId: ${originalId}`);

    if (ticketStatus !== 'COMPLETED') {
      console.warn(
        `⚠️ [GATEWAY-${requestId}] Ticket no se marcó como completado. Status: ${ticketStatus}`,
      );
      const finalEndTime = Date.now();
      const totalDuration = finalEndTime - startTime;
      console.log(
        `🟡 [GATEWAY-${requestId}] PROCESO COMPLETO (status no completado): ${totalDuration}ms`,
      );
      return ticket;
    }

    try {
      console.log(
        `🟢 [GATEWAY-${requestId}] 🎉 Procesando ticket completado...`,
      );
      const processingStart = Date.now();

      // Usar originalId o id dependiendo de la estructura
      const ticketIdToUse = originalId || id;
      console.log(
        `🟢 [GATEWAY-${requestId}] Usando ticketId: ${ticketIdToUse}`,
      );

      // 1. Registrar ticket completado del ejecutivo
      console.log(
        `🟢 [GATEWAY-${requestId}] [${Date.now()}] Registrando ticket completado...`,
      );
      const registerStart = Date.now();

      const myCompletedCount = await this.registerExecutiveCompletedTicket(
        queueId,
        user.id,
        ticketIdToUse,
      );

      const registerEnd = Date.now();
      console.log(
        `🟢 [GATEWAY-${requestId}] Ticket ${ticketIdToUse} registrado como completado. Total hoy: ${myCompletedCount} (${registerEnd - registerStart}ms)`,
      );

      // 2. Notificar a ejecutivos
      console.log(
        `🟢 [GATEWAY-${requestId}] [${Date.now()}] Notificando a ejecutivos...`,
      );
      const notifyExecStart = Date.now();

      await this.notifyExecutiveCompletion(
        queueId,
        user.id,
        ticketIdToUse,
        myCompletedCount,
      );

      const notifyExecEnd = Date.now();
      console.log(
        `🟢 [GATEWAY-${requestId}] Notificación a ejecutivos enviada (${notifyExecEnd - notifyExecStart}ms)`,
      );

      // 3. Desuscribir cliente y notificar (si corresponde)
      if (clientUserId && queueId) {
        console.log(
          `🟢 [GATEWAY-${requestId}] [${Date.now()}] Notificando al cliente...`,
        );
        const notifyClientStart = Date.now();

        await this.eventNotificationService.unsubscribeClientFromQueueAndNotify(
          queueId,
          ticketIdToUse,
          clientUserId,
          'COMPLETED',
          user.id,
        );

        const notifyClientEnd = Date.now();
        console.log(
          `🟢 [GATEWAY-${requestId}] Cliente desuscrito y notificado (${notifyClientEnd - notifyClientStart}ms)`,
        );
      } else {
        console.log(
          `🟡 [GATEWAY-${requestId}] Sin cliente para notificar (clientUserId: ${clientUserId}, queueId: ${queueId})`,
        );
      }

      const processingEnd = Date.now();
      const processingDuration = processingEnd - processingStart;

      console.log(
        `✅ [GATEWAY-${requestId}] Ticket ${ticketIdToUse} completado. Total hoy: ${myCompletedCount} (procesamiento: ${processingDuration}ms)`,
      );
    } catch (error) {
      const processingErrorTime = Date.now();
      const processingErrorDuration = processingErrorTime - startTime;

      console.error(
        `❌ [GATEWAY-${requestId}] Error procesando ticket completado después de ${processingErrorDuration}ms:`,
        error,
      );
      // No lanzar error aquí para no afectar la respuesta al cliente
    }

    // Log final de lo que retorna al frontend
    const finalEndTime = Date.now();
    const totalDuration = finalEndTime - startTime;

    console.log(
      `🟢 [GATEWAY-${requestId}] PROCESO COMPLETO: ${totalDuration}ms`,
    );
    console.log(
      `🟢 [GATEWAY-${requestId}] Retornando al frontend:`,
      JSON.stringify(ticket, null, 2),
    );

    return ticket;
  }

  // En tu ExecutiveController, agregar:
  @Get('mis-tickets-completados/:queueId')
  async getCompletedTicketsToday(
    @Param('queueId') queueId: string,
    @User() user: any,
  ) {
    try {
      const executiveId = user.id;
      if (!queueId) {
        throw new BadRequestException('El ID de la cola es requerido');
      }

      const hashKey = `queue:${queueId}:executive:${executiveId}:completed`;
      const myCompletedCount = await this.redis.hlen(hashKey);

      return {
        queueId,
        count: myCompletedCount,
        date: new Date().toISOString().split('T')[0],
        message: `${myCompletedCount} tickets completados hoy`,
      };
    } catch (error) {
      console.error('❌ Error obteniendo tickets completados:', error);
      throw new BadRequestException(`Error obteniendo datos: ${error.message}`);
    }
  }

  // ✅✅✅✅ Marcar como ausente - algoritmo DOA
  @Post('tickets/:id/ausente')
  async markTicketAsAbsent(@Param('id') id: string, @User() user: any) {
    return this.sendMessage('executive.markTicketAsAbsent', {
      ticketId: id,
      userId: user.id,
    });
  }

  // Ver filas asignadas al ejecutivo
  @Get('filas')
  async getAssignedQueues(@User() user: any) {
    return this.sendMessage('executive.getAssignedQueues', {
      userId: user.id,
    });
  }

  @Get('historial-de-atencion')
  async historyAttention(
    @User() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    return this.sendMessage('executive.historyAttention', {
      userId: user.id,
      page: pageNumber,
      limit: limitNumber,
    });
  }
  @Get('panel-de-control')
  async getControlPanel(@User() user: any) {
    return this.sendMessage('executive.getControlPanel', { userId: user.id });
  }

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message ?? error));
  }

  private async sendMessage(pattern: string, data: any) {
    console.log(`🔵 [SENDMESSAGE] Enviando patrón: ${pattern}`);
    console.log(`🔵 [SENDMESSAGE] Data:`, data);

    try {
      const result = await firstValueFrom(
        this.client.send(pattern, data).pipe(
          tap((response) => {
            console.log(`🟢 [SENDMESSAGE] Respuesta recibida:`, response);
          }),
          catchError((error) => {
            console.error(`🔴 [SENDMESSAGE] Error capturado:`, error);
            return throwError(
              () => new BadRequestException(error.message ?? error),
            );
          }),
        ),
      );

      console.log(`🟢 [SENDMESSAGE] Resultado final:`, result);
      return result;
    } catch (error) {
      console.error(`🔴 [SENDMESSAGE] Error en catch:`, error);
      throw error;
    }
  }

  // 🔧 MÉTODOS PRIVADOS DE UTILIDAD:

  private async registerExecutiveCompletedTicket(
    queueId: string,
    executiveId: string,
    ticketId: string,
  ): Promise<number> {
    const hashKey = `queue:${queueId}:executive:${executiveId}:completed`;
    await this.redis.hset(hashKey, `ticket:${ticketId}`, ticketId);
    return await this.redis.hlen(hashKey);
  }

  private async notifyExecutiveCompletion(
    queueId: string,
    executiveId: string,
    ticketId: string,
    completedCount: number,
  ): Promise<void> {
    const executiveChannel = ChannelService.generateCompletedTicketsChannel(
      queueId,
      executiveId,
    );

    await this.eventNotificationService.publishEvent(
      executiveChannel,
      TICKET_COMPLETED_EVENT,
      {
        queueId,
        executiveId,
        ticketId,
        myCompletedToday: completedCount,
      },
    );
  }
}
