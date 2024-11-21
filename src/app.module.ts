import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { QueueRouterModule } from './queue-router/queue-router.module';

@Module({
  imports: [AuthModule, QueueRouterModule],
  controllers: [],
  providers: []
})
export class AppModule {}
