import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class DisconnectionRoom {
  private readonly logger = new Logger();
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async execute(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;

      if (!userId) {
        this.logger.warn('Cliente desconectado sin userId');
        return;
      }

      const room = await this.cacheManager.get<string>(userId);
      console.log(`Cliente desconetcado con su room: ${room}`);
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al desconetar de la sucursal',
      });
    }
  }
}
