import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Socket } from 'socket.io';
import { NATS_SERVICES } from 'src/config';
import { HandleErrorValidator } from './handle-error.validator';

@Injectable()
export class UserInQueue {
  constructor(
    @Inject(NATS_SERVICES)
    private readonly clientNats: ClientProxy,
    private readonly handleError: HandleErrorValidator,
  ) {}

  async execute(client: Socket, branchId: number, userId: number) {
    try {
      const userInQueue = await firstValueFrom(
        this.clientNats.send('check.user.in.queue', { branchId, userId }),
      );

      if (userInQueue) {
        this.handleError.execute(client, 'Usuario ya está en la cola.');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError.execute(client, error.message);
      return true;
    }
  }
}
