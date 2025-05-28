import { IMessageProcessor } from '../interfaces';

export abstract class BaseMessageHandler implements IMessageProcessor {
  abstract canHandle(messageType: string): boolean;
  abstract process(queueId: string, message: any): Promise<void>;

  protected extractQueueId(channel: string): string {
    return channel.split(':')[1];
  }

  protected isValidMessage(message: any): boolean {
    return message && typeof message === 'object' && message.type;
  }

  protected addTimestamp(message: any): any {
    return {
      ...message,
      timestamp: message.timestamp ?? new Date().toISOString(),
    };
  }
}
