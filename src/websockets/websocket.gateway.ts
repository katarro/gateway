import {
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  NATS_SERVICES,
  WS_CHECK_USER_IN_QUEUE,
  WS_JOIN_QUEUE,
  WS_USER_LEFT_QUEUE,
} from 'src/config';
import { firstValueFrom } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/api/ws/cola',
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnModuleInit {
  private static isInitialized = false;
  constructor(
    @Inject(NATS_SERVICES) private readonly clientNats: ClientProxy,
  ) {}

  private readonly logger = new Logger('WS-QueueGateway');

  @WebSocketServer()
  public server: Server;

  onModuleInit() {
    if (WebsocketGateway.isInitialized) {
      return;
    }
    WebsocketGateway.isInitialized = true;
    this.logger.log('Websocket Gateway inicializado');

    this.server.on('connection', (socket: Socket) => {
      this.logger.debug(`Cliente conectado: ${socket.id} `);

      socket.on('disconnect', () => {
        this.logger.debug(`Cliente desconectado: ${socket.id} `);
      });
    });
  }

  // Se debe emitir un evento del cleinte para poder salir de la fila
  // luego gestionar la logica
  @SubscribeMessage(WS_USER_LEFT_QUEUE) // Envio este evento
  async userLeftQueue(@ConnectedSocket() client: Socket) {
    // data lo recibe como string
    const branchId = client.handshake.query.branchId as string;
    const userId = client.handshake.query.userId as string;


    console.log(`BranchId: ${branchId} esde typo: `, typeof branchId);
    console.log(`userId: ${userId} esde typo: `, typeof userId);

    this.server.to('branch-1').emit('branch-1', 'DATA'); // Escucho este evento
  }


  // Cambiar y recibir la data por parametro
  @SubscribeMessage(WS_JOIN_QUEUE)
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string,
  ) {
    let parsedData: { branchId: number; userId: number };

    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      return this.handleError(client, 'Datos inválidos, no se pudo procesar.');
    }

    const { branchId, userId } = parsedData;

    if (!branchId || !userId) {
      return this.handleError(client, 'Datos incompletos.');
    }

    if (!(await this.checkBranchExists(client, branchId))) {
      return;
    }

    if (await this.isUserInQueue(client, branchId, userId)) {
      return;
    }

    try {
      await firstValueFrom(
        this.clientNats.send('join.queue', { branchId, userId }),
      );

      let room: string = `branch-${branchId}`;
      console.log(`Room: ${room}`);

      client.join(room);
      this.logger.debug(
        `Cliente ${client.id}, usuario ${userId}, se unió a la sala branch: ${branchId}`,
      );
    } catch (error) {
      this.handleError(
        client,
        `Error al guardar usuario en cola y/o room: ${error.message}`,
      );
    }
  }

  private async checkBranchExists(
    client: Socket,
    branchId: number,
  ): Promise<boolean> {
    try {
      const branchExists = await firstValueFrom(
        this.clientNats.send('check.branch.exists', { branchId }),
      );

      if (!branchExists) {
        this.handleError(client, 'Sucursal no existe.');
        return false;
      }
      return true;
    } catch (error) {
      this.handleError(
        client,
        'Error al verificar la existencia de la sucursal.',
      );
      return false;
    }
  }

  private async isUserInQueue(
    client: Socket,
    branchId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const userInQueue = await firstValueFrom(
        this.clientNats.send(WS_CHECK_USER_IN_QUEUE, {
          branchId,
          userId,
        }),
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

  public emitEventUserLeftQueue(event: string, data: { branchId: number }) {
    const { branchId } = data;
    const dataParsed = JSON.stringify(data);

    console.log(`Event: ${event} Data parsed: ${dataParsed} `);
    this.server.to(`branch-${branchId}`).emit(event, dataParsed);
  }

  // Eliminar al cliente del room correspondiente
  public removeFromQueue(branchId: number, userId: number) {
    const room = `branch-${branchId}`;
    this.server.socketsLeave(room);
    this.logger.warn(`Usuario ${userId} eliminado del room: ${room}`);
  }

  // Emitir evento para actualizar la cola
  public async emitToQueue(branchId: number, event: string, data: any) {
    this.logger.log(`Enviando evento "${event}" a branch-${branchId} ...`);
    this.server.to(`branch-${branchId}`).emit(event, data);
  }

  @SubscribeMessage('test')
  public testEvent(@MessageBody() data: any) {
    console.log(data);
    this.server.emit('listen.Event', 'data');
  }
}
