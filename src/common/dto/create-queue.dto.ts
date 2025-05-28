import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateQueueDto {
  @IsString()
  name: string;

  @IsString()
  serviceTypeId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
