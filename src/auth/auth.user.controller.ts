import {
  Get,
  Body,
  Post,
  Patch,
  Param,
  Inject,
  UseGuards,
  Controller,
  ParseIntPipe,
  BadRequestException,
  Req,
  Res,
} from '@nestjs/common';
import {
  LoginDto,
  UpdateUserDto,
  UpdateRoleDto,
  RegisterUserDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../common/dto';
import { Role } from './enums';
import { Token, User } from './decorators';
import { NATS_SERVICES } from 'src/config';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './interfaces/current-user.interface';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { Public } from './decorators/public.decorator';

@Controller('auth/usuarios')
@UseGuards(RolesGuard)
export class AuthUserController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  @Public()
  @UseGuards(GoogleOauthGuard)
  @Get('google/login')
  async googleLogin() {
    // return this.sendMessage('auth.google', {});
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const user = req.user;
    if (!user?.email) {
      return res.status(400).json({ message: 'Autenticación fallida' });
    }

    try {
      // Convertir el Observable en un valor con firstValueFrom
      const jwt = await firstValueFrom(this.sendMessage('auth.google', user));

      // Redirige al cliente con el token JWT
      // res.redirect(`/dashboard?token=${jwt}`);

      // Devuelve el token JWT en la respuesta
      return res.status(200).json({
        message: 'Inicio de sesión exitoso',
        access_token: jwt,
      });
      // Luego ese token se valida en el frontend e inicia sesion.
    } catch (error) {
      console.error('Error en googleAuthCallback:', error);
      return res.status(500).json({ message: 'Error en la autenticación' });
    }
  }

  @Public()
  @Post('registrar')
  registerUser(@Body() registerUserDto: RegisterUserDto) {
    return this.sendMessage('register.user.auth', registerUserDto);
  }

  @Public()
  @Post('iniciar-sesion')
  login(@Body() loginDto: LoginDto) {
    return this.sendMessage('login.user.auth', loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('verificar-token')
  async verifyToken(@User() user: CurrentUser, @Token() token: string) {
    return { user, token };
  }

  // @UseGuards(AuthGuard)
  @Patch('cambiar-contrasena/:id')
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.sendMessage('change.password', { id, changePasswordDto });
  }

  @Public()
  @Post('olvidar-contrasena')
  async resetPassword(@Body() correo: ResetPasswordDto) {
    return this.sendMessage('reset.password', correo);
  }

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Get('listar')
  async getUsers() {
    return this.sendMessage('get.users', {});
  }

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Get('usuario/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.sendMessage('get.user.by.id', { id });
  }

  // @UseGuards(AuthGuard)
  @Patch('actualizar/:id')
  async actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.sendMessage('update.user', { id, updateUserDto });
  }

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Patch('actualizar-rol/:id')
  async actualizarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    console.log(updateRoleDto);
    return this.sendMessage('update.role', { id, updateRoleDto });
  }

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message || error));
  }

  private sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data).pipe(catchError(this.handleError));
  }
}
