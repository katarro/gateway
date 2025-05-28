import { Response, Request } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';

export interface ISubscribeToQueueCommand {
  configure(
    queueId: string,
    res: Response,
    req: Request,
    user: CurrentUser,
    body: any,
  ): this;

  execute(): Promise<void>;
}
