import { Module } from '@nestjs/common';
import { AuthUserController } from './auth.user.controller';
import { AuthBranchController } from './auth.branch.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/config/envs';
import { NATS_SERVICES } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard';

@Module({
  controllers: [AuthUserController, AuthBranchController],
  providers: [JwtService, AuthGuard],
  imports: [
    ClientsModule.register([
      {
        name: NATS_SERVICES,
        transport: Transport.NATS,
        options: {
          servers: [envs.nats_servers],
        },
      },
    ]),
  ],
})
export class AuthModule {}
