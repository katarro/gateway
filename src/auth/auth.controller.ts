import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RegisterDto } from '../common/dto/register-auth.dto';
import { LoginDto } from '../common/dto/login-auth.dto';
import { NATS_SERVICES } from 'src/config';
import { CreateSucursalDto } from 'src/common/dto/create-sucursal.dto';
import { catchError, map, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { Token, User } from './decorators';
import { CurrentUser } from './interfaces/current-user.interface';
import { ChangePasswordDto } from 'src/common/dto/change-password.dt';
import { Roles } from './decorators/roles.decorator';
import { Rol } from './enums';
import { RolesGuard } from './guards/roles.guard';
import { ForgotPassword } from 'src/common/dto/forgot-password.dto';

@Controller('auth')
@UseGuards(RolesGuard)
export class AuthController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message || error));
  }

  private sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data).pipe(catchError(this.handleError));
  }

  @Post('usuarios/registrar')
  registerUser(@Body() registerDto: RegisterDto) {
    return this.sendMessage('register.user.auth', registerDto);
  }

  @Post('usuarios/iniciar-sesion')
  iniciarSesion(@Body() loginDto: LoginDto) {
    return this.sendMessage('login.user.auth', loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('usuarios/verificar-token')
  async verificarToken(@User() user: CurrentUser, @Token() token: string) {
    return { user, token };
  }

  @Post('sucursales/registrar')
  @Roles(Rol.Admin)
  async registrarSucursal(
    @Body() createSucursalDto: CreateSucursalDto,
    @Token() token: string,
  ) {
    return this.sendMessage('register.sucursal.auth', {
      createSucursalDto,
      token,
    });
  }

  @UseGuards(AuthGuard)
  @Patch('usuarios/cambiar-contrasena/:id')
  async cambiarContrasena(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.sendMessage('change.password', { id, changePasswordDto });
  }

  @Post('usuarios/olvidar-contrasena')
  async olvidarContrasena(@Body() correo: ForgotPassword) {
    return this.sendMessage('forgot.password', correo);
  }
}
