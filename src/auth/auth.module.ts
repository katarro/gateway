import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [AuthController],
  providers: [JwtService, AuthGuard, GoogleOauthGuard, GoogleStrategy],
  imports: [TransportModule],
})
export class AuthModule {}
