import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { TransportModule } from 'src/transport/transport.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { EventNotificationService } from 'src/redis/event-notification.service';

@Module({
  controllers: [ClientController],
  imports: [TransportModule, RedisModule],
  providers: [EventNotificationService],
})
export class ClientModule {}
