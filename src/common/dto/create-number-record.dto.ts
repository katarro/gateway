import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { Timestamp } from 'rxjs';
import { RegistrationStatus } from 'src/common/dto/branch-status.dto';

export class CreateNumberRecordDto {
  @IsNumber()
  @IsPositive()
  branch_id: number;

  @IsNumber()
  @IsPositive()
  user_id: number;

  @IsNumber()
  @IsPositive()
  number: number;

  @IsEnum(RegistrationStatus)
  status: RegistrationStatus; // Aquí se valida directamente

  created_at: Timestamp<number>
}
