import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ERROR } from 'src/config';

@Injectable()
export class HandleErrorValidator {
  async execute(socket: Socket, message: string) {
    console.error(message);
    socket.emit(ERROR, { message });
  }
}
