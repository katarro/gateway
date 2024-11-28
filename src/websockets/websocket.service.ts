import { firstValueFrom } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NATS_SERVICES, WS_CHECK_USER_IN_QUEUE } from 'src/config';

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger('WS-Service');
  private server: Server;
  constructor(
    @Inject(NATS_SERVICES) private readonly clientNats: ClientProxy,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async handleJoinQueue(client: Socket) {
    // Se recibe por parámetro
    const branchId = client.handshake.query.branchId as string;
    const userId = client.handshake.query.userId as string;

    if (!branchId || !userId) {
      return this.handleError(client, 'Datos incompletos.');
    }

    if (await this.isUserInQueue(client, +branchId, +userId)) {
      return;
    }

    const intBranchId = parseInt(branchId, 10);
    const intUserId = parseInt(userId, 10);

    try {
      await firstValueFrom(
        this.clientNats.send('user.join.queue', {
          branchId: intBranchId,
          userId: intUserId,
        }),
      );

      let room: string = `branch-${branchId}`;

      client.join(room);
      this.logger.log(
        `Cliente ${client.id}, usuario ${userId}, se unió a la sala branch: ${branchId}`,
      );
    } catch (error) {
      this.handleError(
        client,
        `Error al guardar usuario en cola y/o room: ${error.message}`,
      );
    }
  }

  private async isUserInQueue(
    client: Socket,
    branchId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const userInQueue = await firstValueFrom(
        this.clientNats.send(WS_CHECK_USER_IN_QUEUE, { branchId, userId }),
      );

      if (userInQueue) {
        this.handleError(client, 'Usuario ya está en la cola.');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(client, error.message);
      return true;
    }
  }

  private handleError(socket: Socket, message: string) {
    this.logger.error(message);
    socket.emit('error', { message });
  }

  async handleRecordNumber(branchId: number, userId: number) {
    return await firstValueFrom(
      this.clientNats.send('user.add.register.branch', {
        branchId,
        userId,
      }),
    );
  }

  async handleLeftQueueDataBase(branchId: number, userId: number) {
    return await firstValueFrom(
      this.clientNats.send('user.left.queue.branch', {
        branchId,
        userId,
      }),
    );
  }

  async handleLeftQueueRoom(client: Socket, userId: number, room: string) {
    client.leave(room);
    this.logger.error(`Usuario userId=${userId} eliminado del room ${room}`);
  }

  async handleEventEmit(room: string, branchId: number, userId: number) {
    this.server.to(room).emit('queue.updated', {
      message: 'Usuario eliminado de la cola',
      branchId,
      userId,
    });
  }

  async handleNextNumber(client: Socket, branchId: number) {
    return await firstValueFrom(
      this.clientNats.send('next.number.branch', { branchId }),
    );
  }
}
