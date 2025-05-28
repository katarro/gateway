import { Module } from '@nestjs/common';
import { AdminBusinessController } from './admin-business.controller';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [AdminBusinessController],
  imports: [TransportModule],
})
export class AdminBusinessModule {}
