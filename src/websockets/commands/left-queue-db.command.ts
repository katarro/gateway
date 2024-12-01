import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICES } from 'src/config';

@Injectable()
export class LeftQueueDb {
  constructor(
    @Inject(NATS_SERVICES) private readonly clientNats: ClientProxy,
  ) {}

  async execute(branchId: number, userId: number) {
    return await firstValueFrom(
      this.clientNats.send('user.left.queue.branch', {
        branchId,
        userId,
      }),
    );
  }
}
