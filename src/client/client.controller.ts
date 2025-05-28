import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  Param,
  BadRequestException,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { throwError, firstValueFrom, catchError } from 'rxjs';
import { User } from 'src/auth/decorators';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateTicketDto } from 'src/common';
import { NATS_SERVICES } from 'src/config';
import { RedisService } from 'src/redis/redis.service';

@Controller('cliente')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class ClientController {
  constructor(
    @Inject(NATS_SERVICES) private readonly client: ClientProxy,
    private readonly redisService: RedisService,
  ) {}

  // ✅✅✅✅ Tickets
  @Post('tickets/crear')
  async createTicket(
    @Body() createTicketDto: CreateTicketDto,
    @User() user: any,
  ) {
    return this.sendMessage('client.createTicket', {
      createTicketDto,
      userId: user.id,
    });
  }

  @Delete('tickets/:id')
  async deleteTicket(@User() user: any, @Param('id') id: string) {
    console.log(`🗑️ Usuario ${user.id} solicitando eliminar el ticket ${id}`);

    try {
      // 1. Eliminar ticket del microservicio
      const data = await this.sendMessage('client.deleteTicket', {
        userId: user.id,
        ticketId: id,
      });

      // const { queueId } = data;
      // console.log(`✅ Ticket ${id} eliminado del microservicio`);

      // // 2. ❌ NO manipular Redis aquí - lo hace el cleanup automáticamente
      // // 3. ❌ NO publicar eventos que causen reconexiones

      // // 4. ✅ Solo notificar a otros usuarios (opcional)
      // await this.redisService.publishToQueue(queueId, {
      //   type: 'user_left_queue',
      //   userId: user.id,
      //   ticketId: id,
      //   message: 'Un usuario ha abandonado la cola',
      //   timestamp: new Date().toISOString(),
      // });

      console.log(
        `✅ Ticket ${id} eliminado completamente por usuario ${user.id}`,
      );
      return data;
    } catch (error) {
      console.error(`❌ Error eliminando ticket ${id}:`, error);
      throw error;
    }
  }

  @Get('tickets/activos')
  async getActiveTickets(@User() req: any) {
    return this.sendMessage('client.getActiveTickets', { userId: req.user.id });
  }

  // ✅✅✅✅
  @Get('tickets/activos/cola/:queueId')
  async getActiveTicketById(
    @User() user: any,
    @Param('queueId') queueId: string,
  ) {
    return this.sendMessage('client.getActiveTicketByQueue', {
      userId: user.id,
      queueId,
    });
  }

  @Get('tickets/historial')
  async getTicketHistory(@User() req: any) {
    return this.sendMessage('client.getTicketHistory', { userId: req.user.id });
  }

  @Post('tickets/:id/cancelar')
  async cancelTicket(@User() req: any, @Param('id') id: string) {
    return this.sendMessage('client.cancelTicket', { userId: req.user.id, id });
  }

  // Encuestas
  @Post('encuestas')
  async createSurvey(@User() req: any, @Body() body: any) {
    return this.sendMessage('client.createSurvey', {
      userId: req.user.id,
      ...body,
    });
  }

  // Exploración
  @Get('sucursales')
  async getBranches() {
    return this.sendMessage('client.getBranches', {});
  }

  @Get('sucursales/:id/filas')
  async getQueuesByBranch(@Param('id') id: string) {
    return this.sendMessage('client.getQueuesByBranch', { id });
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
