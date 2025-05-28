import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseMessageDto } from './base-message.dto';

/**
 * DTO para mensajes de bienvenida
 * Se envía cuando un usuario se conecta exitosamente a la cola
 */
export class WelcomeMessageDto extends BaseMessageDto {
  @IsString({ message: 'El tipo debe ser welcome' })
  type: 'welcome';

  @IsString({ message: 'El mensaje es requerido' })
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  message: string;

  @IsOptional()
  @IsNumber({}, { message: 'El número de ticket debe ser un número' })
  @IsPositive({ message: 'El número de ticket debe ser positivo' })
  @Transform(({ value }) => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(num) ? undefined : num;
  })
  ticketNumber?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El tiempo estimado debe ser un número' })
  @IsPositive({ message: 'El tiempo estimado debe ser positivo' })
  @Transform(({ value }) => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(num) ? undefined : num;
  })
  estimatedWaitTime?: number;

  @IsOptional()
  @IsString({ message: 'El código de módulo debe ser un string' })
  moduleCode?: string;

  @IsOptional()
  @IsString({ message: 'El email debe ser un string' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  userEmail?: string;

  constructor() {
    super();
    this.type = 'welcome';
  }
}

/**
 * DTO para crear mensajes de bienvenida
 */
export class CreateWelcomeMessageDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  userEmail: string;

  @IsString()
  @IsNotEmpty()
  queueId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  ticketNumber?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedWaitTime?: number;

  @IsOptional()
  @IsString()
  moduleCode?: string;

  @IsOptional()
  @IsString()
  customMessage?: string;
}

/**
 * DTO para datos del ticket que se incluyen en el mensaje de bienvenida
 */
export class TicketDataDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  ticketNumber?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedWaitTime?: number;

  @IsOptional()
  @IsString()
  moduleCode?: string;

  @IsOptional()
  @IsString()
  queueName?: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}

/**
 * Validator helper
 */
export function isWelcomeMessage(obj: any): obj is WelcomeMessageDto {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.type === 'welcome' &&
    typeof obj.message === 'string' &&
    obj.message.length > 0
  );
}

/**
 * Factory para crear mensajes de bienvenida
 */
export class WelcomeMessageFactory {
  static create(data: CreateWelcomeMessageDto): WelcomeMessageDto {
    const welcome = new WelcomeMessageDto();

    welcome.message =
      data.customMessage ||
      `Hola ${data.userEmail}, te has unido exitosamente a la cola.`;
    welcome.queueId = data.queueId;
    welcome.ticketNumber = data.ticketNumber;
    welcome.estimatedWaitTime = data.estimatedWaitTime;
    welcome.moduleCode = data.moduleCode;
    welcome.userEmail = data.userEmail;
    welcome.timestamp = new Date().toISOString();

    return welcome;
  }

  static createWithTicketData(
    userEmail: string,
    queueId: string,
    ticketData?: TicketDataDto,
  ): WelcomeMessageDto {
    const welcome = new WelcomeMessageDto();

    welcome.message = `Hola ${userEmail}, te has unido exitosamente a la cola.`;
    welcome.queueId = queueId;
    welcome.userEmail = userEmail;
    welcome.timestamp = new Date().toISOString();

    if (ticketData) {
      welcome.ticketNumber = ticketData.ticketNumber;
      welcome.estimatedWaitTime = ticketData.estimatedWaitTime;
      welcome.moduleCode = ticketData.moduleCode;
    }

    return welcome;
  }

  static createSimple(userEmail: string, queueId: string): WelcomeMessageDto {
    const welcome = new WelcomeMessageDto();

    welcome.message = `Hola ${userEmail}, te has unido exitosamente a la cola.`;
    welcome.queueId = queueId;
    welcome.userEmail = userEmail;
    welcome.timestamp = new Date().toISOString();

    return welcome;
  }
}
