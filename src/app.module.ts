import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { QueueRouterModule } from './queue-router/queue-router.module';
import { TransportModule } from './transport/transport.module';
import { WebsocketModule } from './websockets/websocket.module';

@Module({
  imports: [AuthModule, QueueRouterModule, TransportModule, WebsocketModule],
  controllers: [],
  providers: []
})
export class AppModule {}
