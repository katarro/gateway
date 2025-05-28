import { Injectable, Inject } from '@nestjs/common';
import { BaseMessageHandler } from './base-message.handler';
import { ILogger, LOGGER_TOKEN } from '../interfaces';
import { UserLeftDto, isUserLeftMessage } from '../dto';

@Injectable()
export class UserLeftHandler extends BaseMessageHandler {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: ILogger) {
    super();
  }

  canHandle(messageType: string): boolean {
    return messageType === 'user_left_queue';
  }

  async process(queueId: string, message: any): Promise<void> {
    try {
      // ✅ Validar con DTO
      if (!isUserLeftMessage(message)) {
        this.logger.warn('Mensaje de usuario abandonando cola inválido', {
          queueId,
          message,
        });
        return;
      }

      // ✅ Crear DTO validado
      const userLeftMessage = new UserLeftDto();
      Object.assign(userLeftMessage, message);

      this.logger.info('Usuario abandonó la cola', {
        queueId,
        userId: userLeftMessage.userId,
        ticketId: userLeftMessage.ticketId,
        reason: userLeftMessage.reason,
      });

      // Para este tipo de mensaje, solo hacemos logging
      // No necesitamos broadcast a otros usuarios
      // (esto es solo para auditoría)
    } catch (error) {
      this.logger.error('Error procesando salida de usuario', error, {
        queueId,
        message,
      });
      throw error;
    }
  }
}
