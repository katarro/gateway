import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [AdminController],
  providers: [],
  imports: [TransportModule],
})
export class AdminModule {}
