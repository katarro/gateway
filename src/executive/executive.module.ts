import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';
import { TransportModule } from 'src/transport/transport.module';
import { SseModule } from 'src/sse/sse.module';

@Module({
  controllers: [ExecutiveController],
  imports: [TransportModule, SseModule],
  providers: [],
})
export class ExecutiveModule {}
