import { Module } from '@nestjs/common';
import { TestMs1Controller } from './test-ms-1.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_SERVICES } from 'src/config';
import { envs } from 'src/config/envs';

@Module({
  controllers: [TestMs1Controller],
  providers: [],
  imports: [
    ClientsModule.register([
      {
        name: NATS_SERVICES,
        transport: Transport.NATS,
        options: {
          servers: [envs.nats_servers],
        },
      },
    ]),
  ],
})
export class TestMs1Module {}
