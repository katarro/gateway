import { Injectable, Inject } from '@nestjs/common';
import {
  IRedisMessageHandler,
  IMessageProcessor,
  ILogger,
  LOGGER_TOKEN,
} from '../interfaces';

import { TicketCalledHandler } from './ticket-called.handler';
import { UserLeftHandler } from './user-left.handler';
import { SystemNotificationHandler } from './system-notification.handler';

@Injectable()
export class MessageHandlerService implements IRedisMessageHandler {
  private readonly processors: IMessageProcessor[] = [];

  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    // Inyectar todos los handlers
    private readonly ticketCalledHandler: TicketCalledHandler,
    private readonly userLeftHandler: UserLeftHandler,
    private readonly systemNotificationHandler: SystemNotificationHandler,
  ) {
    // Registrar todos los procesadores
    this.registerProcessor(ticketCalledHandler);
    this.registerProcessor(userLeftHandler);
    this.registerProcessor(systemNotificationHandler);
  }

  async handleMessage(channel: string, rawMessage: string): Promise<void> {
    try {
      // Parsear mensaje
      const message = this.parseMessage(rawMessage);
      if (!message) {
        this.logger.warn('Mensaje Redis inválido', { channel, rawMessage });
        return;
      }

      const queueId = this.extractQueueId(channel);
      if (!queueId) {
        this.logger.warn('No se pudo extraer queueId del canal', { channel });
        return;
      }

      this.logger.debug('Mensaje Redis recibido', {
        channel,
        queueId,
        messageType: message.type,
      });

      // Buscar procesador adecuado
      const processor = this.findProcessor(message.type);
      if (!processor) {
        this.logger.warn('No hay procesador para el tipo de mensaje', {
          messageType: message.type,
          queueId,
          availableProcessors: this.getProcessorTypes(),
        });
        return;
      }

      // Procesar mensaje
      await processor.process(queueId, message);
    } catch (error) {
      this.logger.error('Error procesando mensaje Redis', error, {
        channel,
        rawMessage: rawMessage.substring(0, 200), // Limitar log para mensajes largos
      });
    }
  }

  // 📋 Registrar nuevos procesadores dinámicamente
  registerProcessor(processor: IMessageProcessor): void {
    this.processors.push(processor);
    this.logger.debug('Procesador registrado', {
      processorName: processor.constructor.name,
    });
  }

  // 🔍 Obtener procesadores registrados
  getRegisteredProcessors(): string[] {
    return this.processors.map((p) => p.constructor.name);
  }

  getProcessorTypes(): string[] {
    // Obtener tipos de mensajes que cada procesador puede manejar
    const types: string[] = [];

    // Esto es un ejemplo básico, podrías hacer que los handlers expongan sus tipos
    this.processors.forEach((processor) => {
      if (processor.constructor.name.includes('TicketCalled')) {
        types.push('TICKET_CALLED_EVENT');
      } else if (processor.constructor.name.includes('UserLeft')) {
        types.push('user_left_queue');
      } else if (processor.constructor.name.includes('SystemNotification')) {
        types.push('system_notification');
      }
    });

    return types;
  }

  // 🔧 Métodos privados de utilidad
  private parseMessage(rawMessage: string): any {
    try {
      const parsed = JSON.parse(rawMessage);
      return this.isValidMessage(parsed) ? parsed : null;
    } catch (error) {
      this.logger.warn('Error parseando mensaje JSON', {
        error: error.message,
        rawMessage: rawMessage.substring(0, 100),
      });
      return null;
    }
  }

  private extractQueueId(channel: string): string | null {
    const parts = channel.split(':');
    return parts.length >= 2 ? parts[1] : null;
  }

  private findProcessor(messageType: string): IMessageProcessor | undefined {
    return this.processors.find((processor) =>
      processor.canHandle(messageType),
    );
  }

  private isValidMessage(message: any): boolean {
    return (
      message && typeof message === 'object' && typeof message.type === 'string'
    );
  }
}

// Importar handlers para evitar errores de dependencias circulares
