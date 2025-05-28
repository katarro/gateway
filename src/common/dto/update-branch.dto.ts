import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsString()
  @IsOptional()
  adminId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
