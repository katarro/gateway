import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class OpinionUserDto {
  @IsString()
  @IsNotEmpty()
  opinion: string;

  @IsNumber()
  userId: number;
}
