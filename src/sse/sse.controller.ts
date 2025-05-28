import {
  Get,
  Req,
  Res,
  Query,
  Param,
  Controller,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SseService } from './sse.service';
import { Response, Request } from 'express';
import { TicketService } from './ticket.service';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('eventos-cola')
@UseGuards(AuthGuard)
export class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly ticketService: TicketService,
  ) {}

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

    if (!user?.id) {
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

    if (!isValid) {
      res
        .status(HttpStatus.FORBIDDEN)
        .write(
          `data: ${JSON.stringify({ error: 'Ticket inválido o vencido' })}\n\n`,
        );
      return res.end();
    }

    this.sseService.subscribeToQueue(queueId, res, req, user, body);
  }
}
