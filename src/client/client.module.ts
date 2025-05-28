import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { TransportModule } from 'src/transport/transport.module';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  controllers: [ClientController],
  imports: [TransportModule, RedisModule],
  providers: [],
})
export class ClientModule {}
