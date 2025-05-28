import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';
import { SseService } from 'src/sse/sse.service';
import { TransportModule } from 'src/transport/transport.module';
import { SubscribeToQueueCommand } from 'src/sse/command/subscribe-to-queue.command';
import { ClientManager } from 'src/sse/managers/client.manager';

@Module({
  controllers: [ExecutiveController],
  imports: [TransportModule],
  providers: [SseService, SubscribeToQueueCommand, ClientManager],
})
export class ExecutiveModule {}
