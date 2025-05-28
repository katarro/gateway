import { Module } from '@nestjs/common';
import { SseService } from 'src/sse/sse.service';
import { ClientController } from './client.controller';
import { TransportModule } from 'src/transport/transport.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { SubscribeToQueueCommand } from 'src/sse/command/subscribe-to-queue.command';
import { ClientManager } from 'src/sse/managers/client.manager';

@Module({
  controllers: [ClientController],
  imports: [TransportModule, RedisModule],
  providers: [SseService, SubscribeToQueueCommand, ClientManager],
})
export class ClientModule {}
