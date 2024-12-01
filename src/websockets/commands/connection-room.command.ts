import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { Socket } from 'socket.io';
import { RECONNECTED } from 'src/config';

@Injectable()
export class ConnectionRoom {
  private readonly logger = new Logger();
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async execute(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;

      if (!userId) {
        this.logger.error('userId no proporcionado en la conexión');
        return;
      }

      const room = await this.cacheManager.get<string>(userId);

      if (room) {
        client.join(room);
        this.logger.log(
          `Usuario ${userId} reconectado automáticamente al room ${room}`,
        );
        client.emit(RECONNECTED, {
          success: true,
          message: 'Reconectado',
          room,
        });
      } else {
        this.logger.log(
          `Usuario ${userId} conectado pero no estaba en un room`,
        );
      }
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al reconectar a la sucursal',
      });
    }
  }
}
