import { IsNotEmpty, IsPhoneNumber, IsString, Length } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @Length(3, 20)
  name: string;

  @IsString()
  admin_email?: string;

  @IsString()
  rut: string;

  @IsString()
  address: string;

  @IsString()
  description: string;

  @IsString()
  email: string;

  @IsString()
  logo?: string;

  @IsString()
  @IsPhoneNumber('CL')
  phone: string;

  @IsString()
  @IsNotEmpty()
  website?: string;
}
