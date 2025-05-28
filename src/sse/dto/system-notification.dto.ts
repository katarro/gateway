import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { BaseMessageDto } from './base-message.dto';

/**
 * DTO para notificaciones del sistema
 * Se usa para enviar alertas, información o errores a todos los usuarios
 */
export class SystemNotificationDto extends BaseMessageDto {
  @IsString({ message: 'El tipo debe ser system_notification' })
  type: 'system_notification';

  @IsString({ message: 'El nivel es requerido' })
  @IsIn(['info', 'warning', 'error'], {
    message: 'El nivel debe ser: info, warning o error',
  })
  level: 'info' | 'warning' | 'error';

  @IsString({ message: 'El mensaje es requerido' })
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  message: string;

  @IsOptional()
  @IsString({ message: 'El código debe ser un string' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'Los detalles deben ser un string' })
  details?: string;

  constructor() {
    super();
    this.type = 'system_notification';
  }
}

/**
 * DTO para crear notificaciones del sistema más fácilmente
 */
export class CreateSystemNotificationDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsIn(['info', 'warning', 'error'])
  level: 'info' | 'warning' | 'error';

  @IsOptional()
  @IsString()
  queueId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  details?: string;
}

/**
 * DTOs para notificaciones específicas comunes
 */

// Notificación de mantenimiento
export class MaintenanceNotificationDto extends SystemNotificationDto {
  constructor(message: string, details?: string) {
    super();
    this.level = 'warning';
    this.message = message;
    this.code = 'MAINTENANCE';
    this.details = details;
  }
}

// Notificación de error del sistema
export class SystemErrorNotificationDto extends SystemNotificationDto {
  constructor(message: string, errorCode?: string, details?: string) {
    super();
    this.level = 'error';
    this.message = message;
    this.code = errorCode || 'SYSTEM_ERROR';
    this.details = details;
  }
}

// Notificación informativa
export class InfoNotificationDto extends SystemNotificationDto {
  constructor(message: string, details?: string) {
    super();
    this.level = 'info';
    this.message = message;
    this.code = 'INFO';
    this.details = details;
  }
}

/**
 * Validator helper
 */
export function isSystemNotification(obj: any): obj is SystemNotificationDto {
  const validLevels = ['info', 'warning', 'error'];

  return (
    obj &&
    typeof obj === 'object' &&
    obj.type === 'system_notification' &&
    typeof obj.message === 'string' &&
    obj.message.length > 0 &&
    validLevels.includes(obj.level)
  );
}

/**
 * Factory para crear notificaciones rápidamente
 */
export class SystemNotificationFactory {
  static createInfo(
    message: string,
    queueId?: string,
    details?: string,
  ): SystemNotificationDto {
    const notification = new InfoNotificationDto(message, details);
    if (queueId) notification.queueId = queueId;
    return notification;
  }

  static createWarning(
    message: string,
    queueId?: string,
    details?: string,
  ): SystemNotificationDto {
    const notification = new MaintenanceNotificationDto(message, details);
    if (queueId) notification.queueId = queueId;
    return notification;
  }

  static createError(
    message: string,
    queueId?: string,
    code?: string,
    details?: string,
  ): SystemNotificationDto {
    const notification = new SystemErrorNotificationDto(message, code, details);
    if (queueId) notification.queueId = queueId;
    return notification;
  }

  static fromCreateDto(
    dto: CreateSystemNotificationDto,
  ): SystemNotificationDto {
    const notification = new SystemNotificationDto();
    notification.message = dto.message;
    notification.level = dto.level;
    notification.queueId = dto.queueId;
    notification.code = dto.code;
    notification.details = dto.details;
    notification.timestamp = new Date().toISOString();

    return notification;
  }
}
