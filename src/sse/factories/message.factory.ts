import { Injectable } from '@nestjs/common';
import {
  WelcomeMessageDto,
  WelcomeMessageFactory,
  TicketCalledResponseDto,
  SystemNotificationDto,
  SystemNotificationFactory,
  BaseMessageDto,
} from '../dto';

/**
 * Tipos para mensajes que no tienen DTO específico
 */
interface ErrorMessage extends BaseMessageDto {
  type: 'error';
  error: string;
  code?: string;
}

interface StatusUpdateMessage extends BaseMessageDto {
  type: 'status_update';
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  details?: string;
}

/**
 * Factory para crear mensajes estandarizados usando DTOs
 * Centraliza la creación de diferentes tipos de mensajes SSE validados
 */
@Injectable()
export class MessageFactory {
  /**
   * 👋 Crear mensaje de bienvenida usando DTO
   */
  createWelcomeMessage(
    userEmail: string,
    queueId: string,
    ticketData?: {
      ticketNumber?: number;
      estimatedWaitTime?: number;
      moduleCode?: string;
    },
  ): WelcomeMessageDto {
    return WelcomeMessageFactory.createWithTicketData(
      userEmail,
      queueId,
      ticketData,
    );
  }

  /**
   * 📢 Crear mensaje de ticket llamado usando DTO
   */
  createTicketCalledMessage(
    queueId: string,
    ticketNumber: number,
    customMessage?: string,
  ): TicketCalledResponseDto {
    return new TicketCalledResponseDto({
      queueId,
      currentTicketNumber: ticketNumber,
      message: customMessage || `Ticket ${ticketNumber} llamado`,
    });
  }

  /**
   * 💓 Crear mensaje de heartbeat
   */
  createHeartbeatMessage(queueId?: string): BaseMessageDto {
    const heartbeat = new BaseMessageDto();
    heartbeat.type = 'heartbeat';
    heartbeat.queueId = queueId;
    heartbeat.timestamp = new Date().toISOString();

    return heartbeat;
  }

  /**
   * 🔔 Crear mensaje del sistema usando DTO
   */
  createSystemMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    queueId?: string,
  ): SystemNotificationDto {
    return SystemNotificationFactory.fromCreateDto({
      message,
      level,
      queueId,
    });
  }

  /**
   * ❌ Crear mensaje de error
   */
  createErrorMessage(
    error: string,
    code?: string,
    queueId?: string,
  ): ErrorMessage {
    const errorMessage = new BaseMessageDto();
    errorMessage.type = 'error';
    errorMessage.queueId = queueId;

    return {
      ...errorMessage,
      error,
      code,
    } as ErrorMessage;
  }

  /**
   * 🔄 Crear mensaje personalizado con timestamp automático
   */
  createCustomMessage(
    type: string,
    data: any,
    queueId?: string,
  ): BaseMessageDto {
    const customMessage = new BaseMessageDto();
    customMessage.type = type;
    customMessage.queueId = queueId;

    return {
      ...customMessage,
      ...data,
    };
  }

  /**
   * 📝 Formatear mensaje para SSE (agregar "data: " y "\n\n")
   */
  formatForSSE(message: BaseMessageDto | any): string {
    // Asegurar que tenga timestamp
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }

    return `data: ${JSON.stringify(message)}\n\n`;
  }

  /**
   * 📦 Crear múltiples mensajes de una vez
   */
  createBatchMessages(
    type: string,
    dataArray: any[],
    queueId?: string,
  ): BaseMessageDto[] {
    const timestamp = new Date().toISOString();

    return dataArray.map((data, index) => {
      const message = new BaseMessageDto();
      message.type = type;
      message.queueId = queueId;
      message.timestamp = timestamp;

      return {
        ...message,
        batchIndex: index,
        batchTotal: dataArray.length,
        ...data,
      };
    });
  }

  // 🔧 Métodos de utilidad

  /**
   * Validar que un mensaje tenga la estructura correcta
   */
  isValidMessage(message: any): message is BaseMessageDto {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'string' &&
      message.type.length > 0
    );
  }

  /**
   * Agregar timestamp a mensaje existente si no lo tiene
   */
  ensureTimestamp(message: any): any {
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    return message;
  }

  /**
   * Crear mensaje de ping (keepalive)
   */
  createPingMessage(queueId?: string): BaseMessageDto {
    const ping = new BaseMessageDto();
    ping.type = 'ping';
    ping.queueId = queueId;

    return ping;
  }

  /**
   * Crear mensaje de información de cola
   */
  createQueueInfoMessage(
    queueId: string,
    info: {
      totalClients?: number;
      currentTicket?: number;
      estimatedWait?: number;
      queueLength?: number;
    },
  ): BaseMessageDto {
    const queueInfo = new BaseMessageDto();
    queueInfo.type = 'queue_info';
    queueInfo.queueId = queueId;

    return {
      ...queueInfo,
      ...info,
    };
  }

  /**
   * Crear mensaje de actualización de estado
   */
  createStatusUpdateMessage(
    status: 'connected' | 'disconnected' | 'reconnecting' | 'error',
    details?: string,
    queueId?: string,
  ): StatusUpdateMessage {
    const statusUpdate = new BaseMessageDto();
    statusUpdate.type = 'status_update';
    statusUpdate.queueId = queueId;

    return {
      ...statusUpdate,
      status,
      details,
    } as StatusUpdateMessage;
  }
}
