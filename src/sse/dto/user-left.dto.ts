import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { BaseMessageDto } from './base-message.dto';

/**
 * DTO para mensajes de usuario abandonando cola
 * Se usa principalmente para auditoría y logging
 */
export class UserLeftDto extends BaseMessageDto {
  @IsString({ message: 'El tipo debe ser user_left_queue' })
  type: 'user_left_queue';

  @IsString({ message: 'El userId es requerido' })
  @IsNotEmpty({ message: 'El userId no puede estar vacío' })
  @IsUUID('4', { message: 'El userId debe ser un UUID válido' })
  userId: string;

  @IsString({ message: 'El ticketId es requerido' })
  @IsNotEmpty({ message: 'El ticketId no puede estar vacío' })
  @IsUUID('4', { message: 'El ticketId debe ser un UUID válido' })
  ticketId: string;

  @IsOptional()
  @IsString({ message: 'El mensaje debe ser un string' })
  message?: string;

  @IsOptional()
  @IsString({ message: 'La razón debe ser un string' })
  reason?: 'manual_delete' | 'timeout' | 'connection_lost' | 'system_cleanup';

  constructor() {
    super();
    this.type = 'user_left_queue';

    // Mensaje por defecto
    if (!this.message) {
      this.message = 'Un usuario ha abandonado la cola';
    }
  }
}

/**
 * DTO para crear mensaje de usuario abandonando cola
 */
export class CreateUserLeftDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  userId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  ticketId: string;

  @IsString()
  @IsNotEmpty()
  queueId: string;

  @IsOptional()
  @IsString()
  reason?: 'manual_delete' | 'timeout' | 'connection_lost' | 'system_cleanup';

  @IsOptional()
  @IsString()
  customMessage?: string;
}

/**
 * Validator helper
 */
export function isUserLeftMessage(obj: any): obj is UserLeftDto {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.type === 'user_left_queue' &&
    typeof obj.userId === 'string' &&
    obj.userId.length > 0 &&
    typeof obj.ticketId === 'string' &&
    obj.ticketId.length > 0
  );
}

/**
 * Transformer para convertir CreateUserLeftDto a UserLeftDto
 */
export function createUserLeftMessage(data: CreateUserLeftDto): UserLeftDto {
  const dto = new UserLeftDto();
  dto.userId = data.userId;
  dto.ticketId = data.ticketId;
  dto.queueId = data.queueId;
  dto.reason = data.reason || 'manual_delete';
  dto.message = data.customMessage || 'Un usuario ha abandonado la cola';
  dto.timestamp = new Date().toISOString();

  return dto;
}
