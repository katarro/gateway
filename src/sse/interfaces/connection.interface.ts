import { Response } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';

export interface SseClient {
  id: string;
  user: CurrentUser;
  res: Response;
  connectedAt: Date;
  lastHeartbeat?: Date;
}

export interface IConnectionManager {
  addConnection(queueId: string, client: SseClient): void;
  removeConnection(queueId: string, clientId: string): boolean;
  getConnections(queueId: string): SseClient[];
  getConnectionCount(queueId: string): number;
  findConnectionByUser(queueId: string, userId: string): SseClient | undefined;
  getAllActiveQueues(): string[];
  getTotalConnections(): number;
}
