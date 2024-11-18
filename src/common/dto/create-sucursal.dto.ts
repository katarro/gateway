import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateSucursalDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsDate()
  @IsNotEmpty()
   @Type(() => Date)
  horario: Date;

  @IsBoolean()
  @IsNotEmpty()
  estado: boolean;
}
