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
import { catchError, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './interfaces/current-user.interface';

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
}
