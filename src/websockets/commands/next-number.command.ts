import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitDb } from './event-emit-db.command';
import { ERROR, QUEUE_UPDATED } from 'src/config';

@Injectable()
export class NextNumber {
  private server: Server;
  private readonly logger = new Logger();

  constructor(private readonly eventEmitDb: EventEmitDb) {}

  setServer(server: Server) {
    this.server = server;
  }

  async execute(client: Socket) {
    try {
      const { branchId, userId } = client.handshake.query as {
        branchId: string;
        userId: string;
      };

      const intBranchId = parseInt(branchId, 10);
      const intUserId = parseInt(userId, 10);

      // avanzar el numero del branch
      const result = await this.eventEmitDb.execute(intBranchId, intUserId);

      // Emitir el evento desde el servidor hacia los clientes en el room
      const room = `branch-${branchId}`;
      this.server.to(room).emit(QUEUE_UPDATED, {
        message: 'Número avanzado',
        current_number: result.data.current_number,
      });
    } catch (error) {
      this.logger.error(
        `Error avanzando número en la sucursal`,
        error,
      );

      client.emit(ERROR, {
        message:
          'No se pudo avanzar el número en la sucursal. Inténtalo más tarde.',
      });
    }
  }
}
