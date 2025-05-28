import { Module } from '@nestjs/common';
import { AnonymousController } from './anonymous.controller';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [AnonymousController],
  imports: [TransportModule],
})
export class AnonymousModule {}
