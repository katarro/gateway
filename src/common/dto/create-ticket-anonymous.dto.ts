import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEmail,
  IsString,
  IsEnum,
} from 'class-validator';
import { EntryType } from 'src/auth/enums';

export class CreateTicketAnonymousDto {
  @IsNotEmpty()
  @IsUUID()
  queueId: string;

  @IsOptional()
  @IsEmail()
  anonymousEmail?: string;

  @IsOptional()
  @IsString()
  anonymousPhone?: string;

  @IsOptional()
  @IsEnum(EntryType)
  entryType?: EntryType = EntryType.VIRTUAL;
}
