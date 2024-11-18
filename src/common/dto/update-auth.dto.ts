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

export class UpdateDto {
  
  @IsUUID()
  id: string;

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

  @IsEnum(Role)
  rol: Role;

  @IsNumber()
  @IsPositive()
  sucursal_id: number;
}
