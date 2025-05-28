import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseMessageDto } from './base-message.dto';
import { TICKET_CALLED_EVENT } from 'src/config';

/**
 * DTO para mensajes de ticket llamado
 * Valida que el mensaje tenga el formato correcto
 */
export class TicketCalledDto extends BaseMessageDto {
  @IsString({ message: 'El tipo debe ser TICKET_CALLED_EVENT' })
  @Transform(({ value }) => (value === TICKET_CALLED_EVENT ? value : undefined))
  type: typeof TICKET_CALLED_EVENT;

  @IsString({ message: 'El queueId es requerido' })
  @IsNotEmpty({ message: 'El queueId no puede estar vacío' })
  queueId: string;

  @IsNumber({}, { message: 'El número de ticket debe ser un número' })
  @IsPositive({ message: 'El número de ticket debe ser positivo' })
  @Transform(({ value }) => {
    // Convertir string a number si es necesario
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(num) ? value : num;
  })
  currentTicketNumber: number;

  @IsOptional()
  @IsString({ message: 'El mensaje debe ser un string' })
  message?: string;

  constructor() {
    super();
    this.type = TICKET_CALLED_EVENT;

    // Generar mensaje por defecto si no viene
    if (!this.message && this.currentTicketNumber) {
      this.message = `Ticket ${this.currentTicketNumber} llamado`;
    }
  }
}

/**
 * DTO para la respuesta de ticket llamado (lo que se envía a los clientes)
 */
export class TicketCalledResponseDto {
  @IsString()
  type: typeof TICKET_CALLED_EVENT;

  @IsString()
  queueId: string;

  @IsNumber()
  @IsPositive()
  currentTicketNumber: number;

  @IsString()
  message: string;

  @IsString()
  timestamp: string;

  constructor(data: Partial<TicketCalledResponseDto> = {}) {
    this.type = TICKET_CALLED_EVENT;
    this.queueId = data.queueId || '';
    this.currentTicketNumber = data.currentTicketNumber || 0;
    this.message = data.message || `Ticket ${this.currentTicketNumber} llamado`;
    this.timestamp = data.timestamp || new Date().toISOString();
  }
}

/**
 * Validator helper para verificar si un objeto es un TicketCalledDto válido
 */
export function isTicketCalledMessage(obj: any): obj is TicketCalledDto {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.type === TICKET_CALLED_EVENT &&
    typeof obj.queueId === 'string' &&
    obj.queueId.length > 0 &&
    typeof obj.currentTicketNumber === 'number' &&
    obj.currentTicketNumber > 0
  );
}

/**
 * Transformer para convertir objeto plano a TicketCalledDto
 */
export function transformToTicketCalledDto(obj: any): TicketCalledDto | null {
  try {
    const dto = new TicketCalledDto();
    dto.type = obj.type;
    dto.queueId = obj.queueId;
    dto.currentTicketNumber = obj.currentTicketNumber;
    dto.message = obj.message;
    dto.timestamp = obj.timestamp || new Date().toISOString();

    return isTicketCalledMessage(dto) ? dto : null;
  } catch (error) {
    console.error('Error transforming to TicketCalledDto:', error);
    return null;
  }
}
