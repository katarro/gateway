import {
  Get,
  Body,
  Post,
  Inject,
  UseGuards,
  Controller,
  BadRequestException,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { envs } from 'src/config/envs';
import { Token, User } from './decorators';
import { NATS_SERVICES } from 'src/config';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ClientProxy } from '@nestjs/microservices';
import { Public } from './decorators/public.decorator';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { CurrentUser } from './interfaces/current-user.interface';
import { LoginDto, ResetPasswordDto, PublicRegisterUserDto } from '../common';

// Endpoints Públicos - Sin autenticación
@Public()
@Controller('auth')
@UseGuards(RolesGuard)
export class AuthController {
  private readonly isDevelopment: boolean;
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {
    this.isDevelopment = envs.environment === 'development';
  }

  // ✅✅✅✅
  @Get('test')
  async test() {
    return this.sendMessage('test.auth', {});
  }

  // ✅✅✅✅
  @UseGuards(GoogleOauthGuard)
  @Get('google/login')
  async googleLogin() {
    // return this.sendMessage('auth.google', {});
  }

  // ✅✅✅✅
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const user = req.user;
    console.log('Usuario de Google:', user);
    if (!user?.email) {
      return res.status(400).json({ message: 'Autenticación fallida' });
    }

    try {
      console.log('Usuario autenticado:', user);
      // Convertir el Observable en un valor con firstValueFrom
      const jwt = await this.sendMessage('auth.google', user);

      // Redirige al cliente con el token JWT
      // res.redirect(`/dashboard?token=${jwt}`);

      // Devuelve el token JWT en la respuesta
      return res.status(HttpStatus.OK).json({
        message: 'Inicio de sesión exitoso',
        access_token: jwt,
      });
      // Luego ese token se valida en el frontend e inicia sesion.
    } catch (error) {
      console.error('Error en googleAuthCallback:', error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Error en la autenticación' });
    }
  }

  // ✅✅✅✅
  @Post('registrar')
  async registerUser(@Body() createUserDto: PublicRegisterUserDto) {
    return this.sendMessage('public.register.user.auth', createUserDto);
  }

  // ✅✅✅✅
  @Post('iniciar-sesion')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.sendMessage('public.login.user.auth', loginDto);

    const cookieOptions = {
      httpOnly: true,
      secure: !this.isDevelopment,
      sameSite: this.isDevelopment ? ('lax' as const) : ('none' as const),
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
    };
    res.cookie('access_token', result.access_token, cookieOptions);

    return {
      status: result.status,
      user: result.user,
      message: result.message,
      access_token: result.access_token,
    };
  }

  // ✅✅✅✅
  @UseGuards(AuthGuard)
  @Get('verificar-token')
  async verifyToken(@User() user: CurrentUser, @Token() token: string) {
    return { user, token };
  }

  // ✅✅❌
  @Post('recuperar-contrasena')
  async resetPassword(@Body() email: ResetPasswordDto) {
    return this.sendMessage('public.reset.password', email);
  }

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message ?? error));
  }

  private async sendMessage(pattern: string, data: any) {
    return await firstValueFrom(
      this.client.send(pattern, data).pipe(catchError(this.handleError)),
    );
  }
}
