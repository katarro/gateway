import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';
import { Rol } from 'src/auth/enums';


export class RegisterDto {
  @IsString()
  @Length(3, 20)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsStrongPassword({
    minSymbols: 0,
    minLength: 8,
  })
  contrasena: string;

  @IsEnum(Rol)
  @IsOptional()
  rol?: Rol;
}
