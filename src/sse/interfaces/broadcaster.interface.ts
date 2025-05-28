export interface IMessageBroadcaster {
  broadcastToQueue(queueId: string, message: any): Promise<void>;
  broadcastToUser(userId: string, queueId: string, message: any): Promise<void>;
  broadcastHeartbeat(): Promise<void>;
  broadcastSystemMessage(
    message: string,
    type?: 'info' | 'warning' | 'error',
  ): Promise<void>;
}
