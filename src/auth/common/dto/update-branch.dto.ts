import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, IsDate } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsDate()
  @Type(() => Date) 
  @IsNotEmpty()
  schedule: Date;

  @IsBoolean()
  @IsNotEmpty()
  status: boolean;

  @IsBoolean()
  @IsNotEmpty()
  available: boolean;
}
