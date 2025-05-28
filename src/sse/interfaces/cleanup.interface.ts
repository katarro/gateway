export interface ICleanupService {
  cleanupUser(queueId: string, userId: string): Promise<void>;
  cleanupQueue(queueId: string): Promise<void>;
  cleanupDisconnectedClients(): Promise<number>;
}
