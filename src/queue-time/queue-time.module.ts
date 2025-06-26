import { Module } from '@nestjs/common';
import { QueueTimeController } from './queue-time.controller';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [QueueTimeController],
  imports: [TransportModule],
  providers: [],
})
export class QueueTimeModule {}
