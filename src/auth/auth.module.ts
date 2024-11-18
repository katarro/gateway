import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/config/envs';
import { NATS_SERVICES } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard';

@Module({
  controllers: [AuthController],
  providers:[JwtService, AuthGuard],
  imports: [
    ClientsModule.register([
      {
        name: NATS_SERVICES,
        transport: Transport.NATS,
        options:{
          servers: [envs.nats_servers]
        }

      }
    ])
  ]
})
export class AuthModule {}
