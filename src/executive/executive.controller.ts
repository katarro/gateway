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
import { SseService } from 'src/sse/sse.service';
import {
  NATS_SERVICES,
  REDIS_PUB_CLIENT,
  TICKET_CALLED_EVENT,
} from 'src/config';
import { Redis } from 'ioredis';

@Controller('ejecutivo')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.EXECUTIVE)
export class ExecutiveController {
  constructor(
    @Inject(NATS_SERVICES) private readonly client: ClientProxy,
    @Inject(REDIS_PUB_CLIENT) private readonly redis: Redis,
    private readonly sseService: SseService,
  ) {}

  // ✅✅✅✅ Obtener ticket actual del módulo asignado
  @Get('tickets/actual')
  async getCurrentTicket(@User() user: any) {
    return this.sendMessage('executive.getCurrentTicket', { userId: user.id });
  }

  // ✅✅❌❌ Llamar al siguiente (avanza la cola y emite evento)
  @Post('tickets/llamar-siguiente')
  async callNextTicket(@User() user: any) {
    const result = await this.sendMessage('executive.callNextTicket', {
      userId: user.id,
    });

    const ticketNumber = result?.ticket?.ticketNumber;
    const queueId = result?.queueId;

    if (ticketNumber && queueId) {
      await this.redis.publish(
        `queue:${queueId}`,
        JSON.stringify({
          type: TICKET_CALLED_EVENT,
          queueId,
          currentTicketNumber: ticketNumber,
          timestamp: new Date(),
        }),
      );
    }

    return result;
  }

  // ✅✅✅✅ Completar ticket actual, lo borra de la cola y lo envia a ticket history
  @Post('tickets/:id/completar')
  async completeTicket(@Param('id') id: string, @User() user: any) {
    return this.sendMessage('executive.completeTicket', {
      ticketId: id,
      userId: user.id,
    });
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

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message ?? error));
  }

  private async sendMessage(pattern: string, data: any) {
    return await firstValueFrom(
      this.client.send(pattern, data).pipe(catchError(this.handleError)),
    );
  }
}
/*
Cuando no existe
   "id": "348ae51a-e488-4f04-8da4-a2d4a00514f8",
    "name": "Cliente 2",
    "email": "cliente2@freeq.cl",
    "phone": "+56967890123",
    "picture": null,
    "rut": null,
    "queueId": "c11312d4-d7c1-4ab8-9f91-26ddc37dad64",
    "ticket": {
        "id": "3702ab07-52a1-475f-b8ef-9182b9493f31",
        "ticketNumber": 2,
        "queue": "Atención General",
        "serviceModule": "Módulo 1",
        "entryType": "VIRTUAL",
        "status": "CALLED",
        "entryTime": "25/05/2025 - 06:06:40",
        "callTime": "25/05/2025 - 06:18:55"
    }

    cuando si

    {
    "id": "3702ab07-52a1-475f-b8ef-9182b9493f31",
    "queueId": "c11312d4-d7c1-4ab8-9f91-26ddc37dad64",
    "userId": "348ae51a-e488-4f04-8da4-a2d4a00514f8",
    "serviceModuleId": "8b83d54e-d241-4c0a-8c2e-9e0c48a84631",
    "executiveId": null,
    "anonymousEmail": null,
    "anonymousPhone": null,
    "registrationToken": null,
    "ticketNumber": 2,
    "estimatedWaitTime": 10,
    "priorityLevel": 0,
    "status": "CALLED",
    "entryTime": "2025-05-25T06:06:40.314Z",
    "callTime": "2025-05-25T06:18:55.483Z",
    "serviceTime": null,
    "endTime": null,
    "entryType": "VIRTUAL",
    "createdOffline": false,
    "syncStatus": "SYNCED",
    "absenceCount": 0,
    "createdAt": "2025-05-25T06:06:40.315Z",
    "updatedAt": "2025-05-25T06:18:55.484Z",
    "moduleCode": "G"
}



*/
