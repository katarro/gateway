import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Socket } from 'socket.io';
import { NATS_SERVICES } from 'src/config';
import { UserInQueue } from '../validators/user-in-queue.validator';
import { HandleErrorValidator } from '../validators/handle-error.validator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class JoinQueue {
  constructor(
    @Inject(NATS_SERVICES) private readonly clientNats: ClientProxy,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,

    private readonly userInQueue: UserInQueue,
    private readonly handleError: HandleErrorValidator,
  ) {}

  /**

    Se debe manejar la reconexion, porque, en el frontend
    cuando estoy esperando mi turno, estoy en la vista de la sucursal x.
    De rrepente, se me va la señal y vuelve, hubo desconexion, 
    pero no se reconectó al room, porque la conexion al room se hace a través de ws.join.queue.

    Necesito manejar la reconexion sin que el usuario envie un evento directamente, es decir,
    el usuario no tiene que apretar nada, la reconexion e insercion al room debe se automatica cuando detecte al reconexion.


   */
  async execute(client: Socket) {
    const branchId = client.handshake.query.branchId as string;
    const userId = client.handshake.query.userId as string;
    let room: string = `branch-${branchId}`;

    // Verificar si el usuario ya está en la caché
    const cachedRoom = await this.cacheManager.get<string>(userId);
    if (cachedRoom) {
      console.log(`Usuario ${userId} ya está en la caché, room: ${cachedRoom}`);
      client.join(cachedRoom); 
      return;
    }

    // Si no está en la caché, guárdalo
    await this.cacheManager.set(userId, room); 
    client.join(room); 
    console.log(
      `Usuario ${userId} agregado al room ${room} y guardado en caché`,
    );
    if (!branchId || !userId) {
      return this.handleError.execute(client, 'Datos incompletos.');
    }

    if (await this.userInQueue.execute(client, +branchId, +userId)) {
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

      client.join(room);
      console.log(
        `Cliente ${client.id}, usuario ${userId}, se unió a la sala branch: ${branchId}`,
      );
    } catch (error) {
      this.handleError.execute(
        client,
        `Error al guardar usuario en cola y/o room: ${error.message}`,
      );
    }
  }
}
