import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RegisterDto } from '../common/dto/register-auth.dto';
import { LoginDto } from '../common/dto/login-auth.dto';
import { NATS_SERVICES } from 'src/config';
import { CreateSucursalDto } from 'src/common/dto/create-sucursal.dto';
import { catchError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { User } from './decorators';
import { CurrentUser } from './interfaces/current-user.interface';

@Controller('auth')
export class AuthController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  //@Post - register
  @Post('register')
  registerUser(@Body() registerDto: RegisterDto) {
    return this.client.send('register_user_auth', registerDto).pipe(
      catchError((error) => {
        throw new BadRequestException(error);
      }),
    );
  }

  //@Post - login
  @HttpCode(HttpStatus.OK)
  @Post('login')
  loginUser(@Body() loginDto: LoginDto) {
    return this.client.send('login_user_auth', loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('verify-token')
  async verifyToken(@User() user: CurrentUser, ) {
    return user;

    // poder retornar user y token de la request
    
    // console.log()
    // return this.client.send('verify_token', token);
  }

  @Post('register_sucursal')
  async registerSucursal(@Body() createSucursalDto: CreateSucursalDto) {
    return this.client.send('register_sucursal_auth', createSucursalDto);
  }

  // change password
}
