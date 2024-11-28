import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UserBranchDto {
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  branchId: number;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  userId: number;
}
