export interface IRedisMessageHandler {
  handleMessage(channel: string, message: string): Promise<void>;
}

export interface IMessageProcessor {
  canHandle(messageType: string): boolean;
  process(queueId: string, message: any): Promise<void>;
}
