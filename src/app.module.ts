import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { QueueRouterModule } from './queue-router/queue-router.module';
import { TransportModule } from './transport/transport.module';
import { WebsocketModule } from './websockets/websocket.module';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    AuthModule,
    QueueRouterModule,
    TransportModule,
    WebsocketModule,
    CacheModule.register({
      ttl: 7200000,
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
