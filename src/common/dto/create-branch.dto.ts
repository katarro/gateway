import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsDate()
  @IsNotEmpty()
   @Type(() => Date)
  schedule: Date;

  @IsBoolean()
  @IsNotEmpty()
  status: boolean;
}
