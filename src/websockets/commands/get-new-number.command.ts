import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Socket } from 'socket.io';
import { ERROR, NATS_SERVICES, NEW_NUMBER_RECIVED } from 'src/config';

@Injectable()
export class GetNewNumber {
  private readonly logger = new Logger();
  constructor(
    @Inject(NATS_SERVICES) private readonly clientNats: ClientProxy,
  ) {}

  async execute(client: Socket) {
    try {
      const { branchId, userId } = client.handshake.query as {
        branchId: string;
        userId: string;
      };

      const intBranchId = parseInt(branchId, 10);
      const intUserId = parseInt(userId, 10);

      // Obtener el nuevo número del usuario desde la base de datos
      const newNumber = await firstValueFrom(
        this.clientNats.send('get.user.new.number', {
          branchId: intBranchId,
          userId: intUserId,
        }),
      );
      const currentNumber = newNumber.data.current_number;
      const message = newNumber.data.message;

      console.log(
        `Nuevo numero es: ${currentNumber} para el usuario: ${userId}`,
      );

      // Enviar el nuevo número al cliente
      client.emit(NEW_NUMBER_RECIVED, {
        branchId,
        userId,
        currentNumber,
        message,
      });
    } catch (error) {
      this.logger.error('Error al obtener el nuevo número', error);
      client.emit(ERROR, {
        message: 'No se pudo obtener el nuevo número',
      });
    }
  }
}
