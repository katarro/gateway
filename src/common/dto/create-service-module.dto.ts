import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateServiceModuleDto {
  @IsString()
  branchId: string;

  @IsString()
  serviceTypeId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  currentExecutiveId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
