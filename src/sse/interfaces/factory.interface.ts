import { Response } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import { SseClient } from './connection.interface';
import { WelcomeMessageDto } from '../dto';

export interface ISseClientFactory {
  createClient(user: CurrentUser, res: Response): SseClient;

  createClientWithWelcome(
    user: CurrentUser,
    res: Response,
    welcomeData: {
      queueId: string;
      ticketNumber?: number;
      estimatedWaitTime?: number;
      moduleCode?: string;
    },
  ): { client: SseClient; welcomeMessage: WelcomeMessageDto };
}
