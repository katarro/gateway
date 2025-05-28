import { IsString, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO base para todos los mensajes
 * Define los campos comunes que deben tener todos los mensajes
 */
export class BaseMessageDto {
  @IsString({ message: 'El tipo de mensaje debe ser un string' })
  type: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'El timestamp debe ser una fecha válida en formato ISO' },
  )
  timestamp?: string;

  @IsOptional()
  @IsString({ message: 'El queueId debe ser un string' })
  queueId?: string;

  constructor() {
    // Agregar timestamp automáticamente si no viene
    if (!this.timestamp) {
      this.timestamp = new Date().toISOString();
    }
  }
}

/**
 * Tipo helper para validar que un objeto es un mensaje válido
 */
export interface ValidatedMessage {
  type: string;
  timestamp: string;
  queueId?: string;
}
