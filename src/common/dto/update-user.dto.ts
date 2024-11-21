import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsStrongPassword,
  IsUUID,
  Length,
} from 'class-validator';

enum Role {
  Admin = 'admin',
  Cliente = 'cliente',
  Ejecutivo = 'ejecutivo',
}

export class UpdateUserDto {
  
  @IsUUID()
  id: string;

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
  role: Role;

  @IsNumber()
  @IsPositive()
  branch_id: number;
}
