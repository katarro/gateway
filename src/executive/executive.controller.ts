import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'src/auth/enums';
import { User } from 'src/auth/decorators';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { NATS_SERVICES } from 'src/config';
import { EventNotificationService } from '../redis/event-notification.service';
import { RedisService } from 'src/redis/redis.service';

@Controller('ejecutivo')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.EXECUTIVE)
export class ExecutiveController {
  constructor(
    @Inject(NATS_SERVICES) private readonly client: ClientProxy,
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

  // ✅ Completar ticket actual
  @Post('tickets/:id/completar')
  async completeTicket(@Param('id') id: string, @User() user: any) {
    try {
      console.log(`🎯 Completando ticket ${id} por usuario ${user.id}`);

      const ticket = await this.sendMessage('executive.completeTicket', {
        ticketId: id,
        userId: user.id,
      });

      // ✅ Verificar que el ticket se completó exitosamente
      if (ticket?.data?.status === 'COMPLETED') {
        console.log('🎉 Publicando evento de ticket completado...');

        // ✅ Publicar evento (esto guarda en Redis y envía SSE)
        await this.eventNotificationService.publishEventCompleteTicket(ticket);

        console.log(`✅ Ticket ${id} completado exitosamente`);
      } else {
        console.warn(
          '⚠️ Ticket no se marcó como completado:',
          ticket?.data?.status,
        );
      }

      return ticket;
    } catch (error) {
      console.error('❌ Error completando ticket:', error);
      throw new BadRequestException(
        `Error completando ticket: ${error.message}`,
      );
    }
  }

  // En tu ExecutiveController, agregar:
  @Get('tickets-completados-hoy/:queueId')
  async getCompletedTicketsToday(@Param('queueId') queueId: string) {
    try {
      if (!queueId) {
        throw new BadRequestException('El ID de la cola es requerido');
      }

      const count =
        await this.redisService.getCompletedTicketsCountToday(queueId);

      return {
        queueId,
        count,
        date: new Date().toISOString().split('T')[0],
        message: `${count} tickets completados hoy`,
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
}
