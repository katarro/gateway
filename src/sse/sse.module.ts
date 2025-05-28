import { Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { TicketService } from './ticket.service';
import { TransportModule } from 'src/transport/transport.module';
import { SubscribeToQueueCommand } from './command/subscribe-to-queue.command';
import { ClientManager } from './managers/client.manager';

@Module({
  providers: [
    SseService,
    TicketService,
    SubscribeToQueueCommand,
    ClientManager,
  ],
  controllers: [SseController],
  imports: [TransportModule],
})
export class SseModule {}
