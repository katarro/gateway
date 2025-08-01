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
import { catchError, firstValueFrom, throwError } from 'rxjs';
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
    console.log('🎯 INICIO callNextTicket - userId:', user?.id);

    let result;

    try {
      console.log(
        '📡 Enviando mensaje a microservicio executive.callNextTicket:',
        {
          userId: user.id,
        },
      );

      result = await this.sendMessage('executive.callNextTicket', {
        userId: user.id,
      });

      console.log('✅ Respuesta del microservicio recibida:', {
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : [],
        fullResult: result,
      });
    } catch (error) {
      console.error('❌ Error en sendMessage:', {
        message: error.message,
        stack: error.stack,
        fullError: error,
      });
      throw error;
    }

    // const ticketNumber = result?.ticket?.ticketNumber;
    const ticketNumber = result?.ticket?.ticketNumber || result?.ticketNumber;

    const queueId = result?.queueId;

    console.log('🔍 Extrayendo datos del resultado:', {
      ticketNumber,
      queueId,
      hasTicketNumber: !!ticketNumber,
      hasQueueId: !!queueId,
      ticketPath: 'result?.ticket?.ticketNumber',
      queuePath: 'result?.queueId',
    });

    if (ticketNumber && queueId) {
      console.log(
        '✅ Datos válidos encontrados, procediendo a actualizar Redis y eventos...',
      );

      try {
        console.log('📡 Llamando publishEventUpdateCurrentTicket:', {
          ticketNumber,
          queueId,
        });

        await this.eventNotificationService.publishEventUpdateCurrentTicket(
          ticketNumber,
          queueId,
        );

        console.log('✅ publishEventUpdateCurrentTicket completado');
      } catch (error) {
        console.error('❌ Error en publishEventUpdateCurrentTicket:', {
          message: error.message,
          stack: error.stack,
        });
      }

      try {
        console.log('📡 Llamando publishEventUpdateCountInQueue:', {
          queueId,
        });

        await this.eventNotificationService.publishEventUpdateCountInQueue(
          queueId,
        );

        console.log('✅ publishEventUpdateCountInQueue completado');
      } catch (error) {
        console.error('❌ Error en publishEventUpdateCountInQueue:', {
          message: error.message,
          stack: error.stack,
        });
      }
    } else {
      console.warn('⚠️ Datos insuficientes para actualizar Redis:', {
        ticketNumber,
        queueId,
        mensaje: 'No se actualizará current_ticket ni count',
        resultCompleto: result,
      });
    }

    console.log('🏁 FIN callNextTicket - retornando resultado:', {
      hasResult: !!result,
      resultKeys: result ? Object.keys(result) : [],
    });

    return result;
  }

  @Post('tickets/:id/completar')
  async completeTicket(@Param('id') id: string, @User() user: any) {
    let ticket: any;
    try {
      ticket = await this.sendMessage('executive.completeTicket', {
        ticketId: id,
        userId: user.id,
      });
    } catch (error) {
      throw error;
    }

    // Si llegamos aquí, el ticket se procesó correctamente
    const ticketData = ticket?.data;

    if (!ticketData) {
      return ticket;
    }

    // Para ticketHistory, los campos son diferentes:
    const {
      status: ticketStatus,
      queueId,
      userId: clientUserId,
      originalId, // Este es el ID original del ticket
    } = ticketData;

    if (ticketStatus !== 'COMPLETED') {
      return ticket;
    }

    try {
      // Usar originalId o id dependiendo de la estructura
      const ticketIdToUse = originalId || id;

      // 1. Registrar ticket completado del ejecutivo

      const myCompletedCount = await this.registerExecutiveCompletedTicket(
        queueId,
        user.id,
        ticketIdToUse,
      );

      // 2. Notificar a ejecutivos

      await this.notifyExecutiveCompletion(
        queueId,
        user.id,
        ticketIdToUse,
        myCompletedCount,
      );

      // 3. Desuscribir cliente y notificar (si corresponde)
      if (clientUserId && queueId) {
        await this.eventNotificationService.unsubscribeClientFromQueueAndNotify(
          queueId,
          ticketIdToUse,
          clientUserId,
          'COMPLETED',
          user.id,
        );
      }
    } catch (error) {
      console.error('❌ Error procesando ticket completado:', error);
    }

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
    return await firstValueFrom(
      this.client.send(pattern, data).pipe(catchError(this.handleError)),
    );
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
