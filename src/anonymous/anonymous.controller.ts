import { Body, Controller, Inject, Post, Get, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateTicketAnonymousDto, RegisterFromTicketDto } from 'src/common';

@Controller('anonimo')
export class AnonymousController {
  constructor(@Inject('NATS_SERVICES') private readonly client: ClientProxy) {}

  @Post('tickets')
  async createTicket(
    @Body() createTicketAnonymousDto: CreateTicketAnonymousDto,
  ) {
    return this.client.send('client.createTicket', createTicketAnonymousDto);
  }

  @Get('tickets/:token')
  async getTicketAnonymous(@Param('token') token: string) {
    return this.client.send('client.getTicketAnonymous', { token });
  }

  @Post('registro')
  async registerFromTicket(
    @Body() registerFromTicketDto: RegisterFromTicketDto,
  ) {
    return this.client.send('client.registerFromTicket', registerFromTicketDto);
  }
}
