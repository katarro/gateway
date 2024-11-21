import { Controller, Inject, Post } from '@nestjs/common';
import { NATS_SERVICES } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';

@Controller('sucursal')
export class TestMs1Controller {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  @Post('obtener-numero')
  findAll(


  ) {
    return this.client.send('findAllTestMs1', {});
  }
}
