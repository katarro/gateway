import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  Param,
  BadRequestException,
  UseGuards,
  Logger,
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
import { EventNotificationService } from 'src/redis/event-notification.service';
import { RedisService } from 'src/redis/redis.service';

@Controller('cliente')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class ClientController {
  logger = new Logger('ClientController');
  constructor(
    @Inject(NATS_SERVICES) private readonly client: ClientProxy,
    private readonly redisService: RedisService,
    private readonly eventNotificationService: EventNotificationService,
  ) {}

  // ✅✅✅✅ Empresas
  @Get('empresas')
  async getCompanies() {
    return this.sendMessage('client.getCompanies', {});
  }

  // ✅✅✅✅ Tickets
  @Post('tickets/crear')
  async createTicket(
    @Body() createTicketDto: CreateTicketDto,
    @User() user: any,
  ) {
    console.log('Create Ticket DTO:', createTicketDto);
    console.log('User ID:', user.id);
    return this.sendMessage('client.createTicket', {
      createTicketDto,
      userId: user.id,
    });
  }

  // ✅✅✅✅ Obtener tickets activos
  @Get('tickets-activos')
  async getActiveTicketsByUser(@User() user: any) {
    console.log('USERID: ', user.id);

    return this.sendMessage('client.getActiveTicketsByUserId', {
      userId: user.id,
    });
  }

  // ✅✅✅✅ Obtener ticket activo por ID de cola
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

  // ✅✅✅✅ Obtener sucursales por empresa
  @Get('sucursales/:companyId')
  async getBranchesByCompany(@Param('companyId') companyId: string) {
    return this.sendMessage('client.getBranchesByCompany', { companyId });
  }

  // ✅✅✅✅ Cancelar un ticket
  @Post('tickets/cancelar/:ticketId')
  async cancelTicket(@User() user: any, @Param('ticketId') ticketId: string) {
    const ticket = await this.sendMessage('client.cancelTicket', {
      userId: user.id,
      ticketId,
    });

    this.logger.log('Ticket cancelled:', ticket);
    console.log('Ticket cancelled:', ticket);
    await this.eventNotificationService.publishEventUpdateCountInQueue(
      ticket.queueId,
    );

    return ticket;
  }

  // ❌❌ CORREGIR
  @Get('servicios/:branchId')
  async getServicesByBranch(@Param('branchId') branchId: string) {
    return this.sendMessage('client.getServicesByBranch', { branchId });
  }

  // ✅❌❌ Solo obtener la cantidad de personas tiempo de espera en una cola específica
  @Get('colas/:queueId/personas-&-tiempo')
  async getPeopleInQueue(@Param('queueId') queueId: string) {
    const usersInQueue = await this.redisService.getUsersInQueue(queueId);
    const waitTime = await this.redisService.getWaitTime(queueId);

    return {
      queueId,
      currentUsersInQueue: usersInQueue.length,
      waitTime: waitTime || 0,
    };
  }

  // ✅✅✅✅
  @Get('tickets/historial')
  async getTicketHistory(@User() user: any) {
    return this.sendMessage('client.getTicketHistory', { userId: user.id });
  }

  // Encuestas
  @Post('encuestas')
  async createSurvey(@User() user: any, @Body() body: any) {
    return this.sendMessage('client.createSurvey', {
      userId: user.id,
      ...body,
    });
  }

  // ✅✅✅✅ Exploración
  @Get('sucursales')
  async getBranches() {
    return this.sendMessage('client.getBranches', {});
  }

  // ✅✅✅✅ Obtener colas por sucursal
  @Get('colas/:branchId')
  async getQueuesByBranch(@Param('branchId') branchId: string) {
    return this.sendMessage('client.getQueuesByBranch', { branchId });
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
