import { Module } from '@nestjs/common';
import { QueueRouterController } from './queue-router.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_SERVICES } from 'src/config';
import { envs } from 'src/config/envs';

@Module({
  controllers: [QueueRouterController],
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
export class QueueRouterModule {}
