import { Injectable, Inject } from '@nestjs/common';
import { BaseMessageHandler } from './base-message.handler';
import { TICKET_CALLED_EVENT } from 'src/config';
import {
  IMessageBroadcaster,
  ILogger,
  MESSAGE_BROADCASTER_TOKEN,
  LOGGER_TOKEN,
} from '../interfaces';
import {
  TicketCalledDto,
  isTicketCalledMessage,
  TicketCalledResponseDto,
} from '../dto';

@Injectable()
export class TicketCalledHandler extends BaseMessageHandler {
  constructor(
    @Inject(MESSAGE_BROADCASTER_TOKEN)
    private readonly broadcaster: IMessageBroadcaster,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {
    super();
  }

  canHandle(messageType: string): boolean {
    return messageType === TICKET_CALLED_EVENT;
  }

  async process(queueId: string, message: any): Promise<void> {
    try {
      // ✅ Validar con DTO
      if (!isTicketCalledMessage(message)) {
        this.logger.warn('Mensaje de ticket llamado inválido', {
          queueId,
          message,
        });
        return;
      }

      // ✅ Crear DTO validado
      const ticketMessage = new TicketCalledDto();
      Object.assign(ticketMessage, message);

      this.logger.info('Procesando ticket llamado', {
        queueId,
        ticketNumber: ticketMessage.currentTicketNumber,
      });

      // ✅ Crear respuesta usando DTO
      const response = new TicketCalledResponseDto({
        queueId,
        currentTicketNumber: ticketMessage.currentTicketNumber,
        message:
          ticketMessage.message ||
          `Ticket ${ticketMessage.currentTicketNumber} llamado`,
      });

      console.log('TicketCalledHandler response:', response);
      // Enviar a todos los clientes de la cola
      await this.broadcaster.broadcastToQueue(queueId, response);

      this.logger.info('Ticket llamado procesado exitosamente', {
        queueId,
        ticketNumber: ticketMessage.currentTicketNumber,
      });
    } catch (error) {
      this.logger.error('Error procesando ticket llamado', error, {
        queueId,
        message,
      });
      throw error;
    }
  }
}
