import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class LeftQueueRoom {
  private readonly logger = new Logger();

  async execute(client: Socket, userId: number, room: string) {
    client.leave(room);
    this.logger.error(`Usuario userId=${userId} eliminado del room ${room}`);
  }
}
