import {
  IsString,
  IsEmail,
  IsStrongPassword,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class PublicRegisterUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsStrongPassword({
    minSymbols: 0,
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  picture?: string;
}
