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
import { RegisterUserDto } from '../common/dto/register.user.dto';
import { LoginDto } from '../common/dto/login.dto';
import { NATS_SERVICES } from 'src/config';
import { CreateBranchDto } from 'src/common/dto/create-branch.dto';
import { catchError, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { Token, User } from './decorators';
import { CurrentUser } from './interfaces/current-user.interface';
import { ChangePasswordDto } from 'src/common/dto/change-password.dto';
import { Roles } from './decorators/roles.decorator';
import { Role } from './enums';
import { RolesGuard } from './guards/roles.guard';
import { ResetPasswordDto } from 'src/common/dto/reset-password.dto';

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
  registerUser(@Body() registerUserDto: RegisterUserDto) {
    return this.sendMessage('register.user.auth', registerUserDto);
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
  @Roles(Role.Admin)
  async registrarSucursal(
    @Body() createBranchDto: CreateBranchDto,
    @Token() token: string,
  ) {
    return this.sendMessage('register.sucursal.auth', {
      createBranchDto,
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
  async olvidarContrasena(@Body() correo: ResetPasswordDto) {
    return this.sendMessage('reset.password', correo);
  }
}
