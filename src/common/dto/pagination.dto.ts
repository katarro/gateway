import { IsOptional, IsPositive, IsNumber } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsPositive()
  @IsNumber()
  limit?: number = 10;
}
