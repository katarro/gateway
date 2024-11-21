import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  RegisterUserDto,
  ChangePasswordDto,
  ResetPasswordDto,
  LoginDto,
} from './common/dto';
import { NATS_SERVICES } from 'src/config';
import { catchError, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { Token, User } from './decorators';
import { CurrentUser } from './interfaces/current-user.interface';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth/usuarios')
@UseGuards(RolesGuard)
export class AuthUserController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message || error));
  }

  private sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data).pipe(catchError(this.handleError));
  }

  @Post('registrar')
  registerUser(@Body() registerUserDto: RegisterUserDto) {
    return this.sendMessage('register.user.auth', registerUserDto);
  }

  @Post('iniciar-sesion')
  iniciarSesion(@Body() loginDto: LoginDto) {
    return this.sendMessage('login.user.auth', loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('verificar-token')
  async verificarToken(@User() user: CurrentUser, @Token() token: string) {
    return { user, token };
  }

  @UseGuards(AuthGuard)
  @Patch('cambiar-contrasena/:id')
  async cambiarContrasena(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.sendMessage('change.password', { id, changePasswordDto });
  }

  @Post('olvidar-contrasena')
  async olvidarContrasena(@Body() correo: ResetPasswordDto) {
    return this.sendMessage('reset.password', correo);
  }
}
