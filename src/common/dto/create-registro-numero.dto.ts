import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { Timestamp } from 'rxjs';
import { EstadoRegistro } from 'src/common/dto/estado-sucursal.dto';

export class CreateRegistroNumeroDto {
  @IsNumber()
  @IsPositive()
  sucursal_id: number;

  @IsNumber()
  @IsPositive()
  usuario_id: number;

  @IsNumber()
  @IsPositive()
  numero: number;

  @IsEnum(EstadoRegistro)
  estado: EstadoRegistro; // Aquí se valida directamente

  creado_en: Timestamp<number>
}
