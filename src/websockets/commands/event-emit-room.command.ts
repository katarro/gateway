import { Server } from 'socket.io';
import { QUEUE_UPDATED } from 'src/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventEmitRoom {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  async execute(room: string, branchId: number, userId: number) {
    this.server.to(room).emit(QUEUE_UPDATED, {
      message: 'Usuario abandonó la cola',
      branchId,
      userId,
    });
  }
}
