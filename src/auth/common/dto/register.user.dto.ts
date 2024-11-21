import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';
import { Role } from 'src/auth/enums';


export class RegisterUserDto {
  @IsString()
  @Length(3, 20)
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minSymbols: 0,
    minLength: 8,
  })
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
