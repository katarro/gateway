import { IsNotEmpty, IsUUID } from 'class-validator';
import { IsValidRut } from 'src/lib/validators/rut.validator';

export class CreateTicketDto {
  @IsValidRut()
  rut: string;

  @IsUUID()
  @IsNotEmpty()
  queueId: string;
}
