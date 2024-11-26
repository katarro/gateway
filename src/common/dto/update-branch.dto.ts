import { Type } from 'class-transformer';
import { IsBoolean, IsString, IsDate, IsOptional } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  schedule?: Date;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsBoolean()
  @IsOptional()
  available?: boolean;
}
