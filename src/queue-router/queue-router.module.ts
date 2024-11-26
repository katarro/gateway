import { Module } from '@nestjs/common';
import { QueueRouterController } from './queue-router.controller';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [QueueRouterController],
  providers: [AuthGuard],
  imports: [TransportModule],
})
export class QueueRouterModule {}
