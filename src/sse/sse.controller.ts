// ============================================
// ARCHIVO: src/sse/sse.controller.ts
// ============================================

import {
  Get,
  Req,
  Res,
  Query,
  Param,
  Controller,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Inject,
  Sse,
} from '@nestjs/common';
import { SseService } from './sse.service';
import { Response, Request } from 'express';
import { TicketService } from './ticket.service';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { catchError, firstValueFrom, Observable, throwError } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { MessageEvent } from 'src/common/interfaces';
import { SseSubscriptionExecutiveService } from './services/sse-subscription-executive.service';
import { EventNotificationService } from 'src/redis/event-notification.service';

@Controller('eventos-cola')
export class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly ticketService: TicketService,
    @Inject('NATS_SERVICES') private readonly client: ClientProxy,
    private readonly sseSubscriptionService: SseSubscriptionExecutiveService,
    private readonly eventNotificationService: EventNotificationService,
  ) {}

  // ✅ ENDPOINT SEPARADO: Solo para conteo de usuarios en cola
  @Sse('ejecutivo/clientes-en-cola/:queueId')
  clientsInQueue(@Param('queueId') queueId: string): Observable<MessageEvent> {
    console.log('📊 Stream SSE para conteo de clientes:', queueId);

    if (!queueId) {
      throw new BadRequestException('El ID de la cola es requerido');
    }

    return this.sseSubscriptionService.createQueueUpdateStream(queueId);
  }

  // ✅ ENDPOINT SEPARADO: Solo para tickets completados
  @Sse('ejecutivo/tickets-completados/:queueId')
  completedTickets(
    @Param('queueId') queueId: string,
  ): Observable<MessageEvent> {
    console.log('🎫 Stream SSE para tickets completados:', queueId);

    if (!queueId) {
      throw new BadRequestException('El ID de la cola es requerido');
    }

    return this.sseSubscriptionService.createCompletedTicketsStream(queueId);
  }

  // ✅ ENDPOINT para suscripción de clientes (sin cambios)
  @UseGuards(AuthGuard)
  @Get('suscribirse/:queueId')
  async subscribeToQueue(
    @Param('queueId') queueId: string,
    @Query('ticketId') ticketId: string,
    @Query('ticketNumber') ticketNumber: string,
    @Query('estimatedWaitTime') estimatedWaitTime: string,
    @Query('moduleCode') moduleCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req['user'] as CurrentUser;

    console.log('User:', user?.email, 'Queue ID:', queueId);

    if (!user?.id) {
      console.log('Usuario no autenticado, enviando error SSE');
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Usuario no autenticado',
        message: 'Debes iniciar sesión para acceder a este recurso',
      });
      return;
    }

    const body = { ticketNumber, estimatedWaitTime, moduleCode };

    const isValid = await this.ticketService.validateTicketRemote(
      ticketId,
      user.id,
      queueId,
    );

    console.log('¿Es válido el ticket?:', isValid);

    if (!isValid) {
      res
        .status(HttpStatus.FORBIDDEN)
        .write(
          `data: ${JSON.stringify({ error: 'Ticket inválido o vencido' })}\n\n`,
        );
      return res.end();
    }

    this.sseService.subscribeToQueue(queueId, res, req, user, body);
    this.eventNotificationService.publishEventUpdateCountInQueue(queueId);
  }

  // ✅ NUEVO: Endpoint para obtener estadísticas
  @Get('estadisticas/:queueId')
  async getQueueStats(@Param('queueId') queueId: string) {
    if (!queueId) {
      throw new BadRequestException('El ID de la cola es requerido');
    }

    return await this.eventNotificationService.getQueueStats(queueId);
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
