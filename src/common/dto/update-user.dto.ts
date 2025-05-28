import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
export class UpdateUserDto {
  @IsString()
  @Length(3, 40)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber('ES')
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  customer_type_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  rut?: string;
}
