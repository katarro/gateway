import { IsNumber, IsPositive } from 'class-validator';

export class SelectSucursalDto {
  @IsNumber()
  @IsPositive()
  sucursal_id: number;
}
