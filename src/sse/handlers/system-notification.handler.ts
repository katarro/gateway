import { Injectable, Inject } from '@nestjs/common';
import { BaseMessageHandler } from './base-message.handler';
import {
  IMessageBroadcaster,
  ILogger,
  MESSAGE_BROADCASTER_TOKEN,
  LOGGER_TOKEN,
} from '../interfaces';
import { SystemNotificationDto, isSystemNotification } from '../dto';

@Injectable()
export class SystemNotificationHandler extends BaseMessageHandler {
  constructor(
    @Inject(MESSAGE_BROADCASTER_TOKEN)
    private readonly broadcaster: IMessageBroadcaster,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {
    super();
  }

  canHandle(messageType: string): boolean {
    return messageType === 'system_notification';
  }

  async process(queueId: string, message: any): Promise<void> {
    try {
      // ✅ Validar con DTO
      if (!isSystemNotification(message)) {
        this.logger.warn('Notificación del sistema inválida', {
          queueId,
          message,
        });
        return;
      }

      // ✅ Crear DTO validado
      const notification = new SystemNotificationDto();
      Object.assign(notification, message);
      notification.queueId = queueId; // Asegurar que tenga el queueId

      this.logger.info('Procesando notificación del sistema', {
        queueId,
        level: notification.level,
        message: notification.message,
        code: notification.code,
      });

      // Enviar a todos los clientes de la cola
      await this.broadcaster.broadcastToQueue(queueId, notification);

      this.logger.info('Notificación del sistema procesada', {
        queueId,
        level: notification.level,
      });
    } catch (error) {
      this.logger.error('Error procesando notificación del sistema', error, {
        queueId,
        message,
      });
      throw error;
    }
  }
}
