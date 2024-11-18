import { IsEmail, IsStrongPassword } from 'class-validator';

export class LoginDto {
  @IsEmail()
  correo: string;

  @IsStrongPassword({
    minSymbols: 0,
    minLength: 8,
  })
  contrasena: string;
}
