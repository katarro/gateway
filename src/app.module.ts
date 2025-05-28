import { Module } from '@nestjs/common';
import { SseModule } from './sse/sse.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ClientModule } from './client/client.module';
import { ExecutiveModule } from './executive/executive.module';
import { AnonymousModule } from './anonymous/anonymous.module';
import { TransportModule } from './transport/transport.module';
import { AdminBranchModule } from './admin-branch/admin-branch.module';
import { AdminBusinessModule } from './admin-business/admin-business.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    AuthModule,
    TransportModule,
    AdminModule,
    AdminBusinessModule,
    AdminBranchModule,
    ExecutiveModule,
    ClientModule,
    AnonymousModule,
    SseModule,
    RedisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
