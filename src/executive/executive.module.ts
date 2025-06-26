import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';
import { TransportModule } from 'src/transport/transport.module';
import { SseModule } from 'src/sse/sse.module';
import { EventNotificationService } from '../redis/event-notification.service';

@Module({
  controllers: [ExecutiveController],
  imports: [TransportModule, SseModule],
  providers: [EventNotificationService],
})
export class ExecutiveModule {}
