import {
  ConnectedSocket,
  WebSocketServer,
  WebSocketGateway,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ClientProxy } from '@nestjs/microservices';
import { WebsocketService } from './websocket.service';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  NATS_SERVICES,
  WS_GET_NEW_NUMBER,
  WS_JOIN_QUEUE,
  WS_USER_LEFT_QUEUE,
} from 'src/config';
import { firstValueFrom } from 'rxjs';

@WebSocketGateway({
  namespace: '/api/ws/cola',
  cors: { origin: '*' },
})
export class WebsocketGateway implements OnModuleInit {
  private static isInitialized = false;
  constructor(
    @Inject(NATS_SERVICES) private readonly clientNats: ClientProxy,
    private readonly wsService: WebsocketService,
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

    this.wsService.setServer(this.server);
  }

  // Cambiar y recibir la data por parametro
  @SubscribeMessage(WS_JOIN_QUEUE)
  async handleJoinQueue(@ConnectedSocket() client: Socket) {
    if (!this.server) {
      this.logger.error('Socket server no está inicializado');
      return;
    }
    return this.wsService.handleJoinQueue(client);
  }

  @SubscribeMessage(WS_USER_LEFT_QUEUE)
  async handleLeftQueue(@ConnectedSocket() client: Socket) {
    if (!this.server) {
      this.logger.error('Socket server no está inicializado');
      return;
    }

    const { branchId, userId } = client.handshake.query as {
      branchId: string;
      userId: string;
    };

    if (!branchId || !userId) {
      this.logger.error('Branch ID or User ID no encontrado');
      return;
    }

    const room = `branch-${branchId}`;
    const intBranchId = parseInt(branchId, 10);
    const intUserId = parseInt(userId, 10);

    try {
      await Promise.all([
        this.wsService.handleRecordNumber(intBranchId, intUserId),
        this.wsService.handleLeftQueueDataBase(intBranchId, intUserId),
        this.wsService.handleLeftQueueRoom(client, intUserId, room),
        this.wsService.handleEventEmit(room, intBranchId, intUserId),
      ]);
    } catch (error) {
      this.logger.error('Error handling left queue', error);
    }
  }

  // El servidor emite el evento 'queue.updated'
  // el cliente recibe ese evento y luego envia un evento al servidor 'get.new.number'
  // el servidor responde con el nuevo numero de la cola
  @SubscribeMessage(WS_GET_NEW_NUMBER)
  async handleGetNewNumber(@ConnectedSocket() client: Socket) {
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
      const message = newNumber.data.message

      console.log(
        `Nuevo numero es: ${currentNumber} para el usuario: ${userId}`,
      );

      // Enviar el nuevo número al cliente
      client.emit('new.number.received', {
        branchId,
        userId,
        currentNumber,
        message        
      });
    } catch (error) {
      this.logger.error('Error al obtener el nuevo número', error);
      client.emit('error', {
        message: 'No se pudo obtener el nuevo número',
      });
    }
  }

  @SubscribeMessage('executive.next.number')
  async handleNextNumber(@ConnectedSocket() client: Socket) {
    const { branchId, userId } = client.handshake.query as {
      branchId: string;
      userId: string;
    };

    const intBranchId = parseInt(branchId, 10);
    const intUserId = parseInt(userId, 10);

    try {
      // avanzar el numero del branch
      const result = await this.wsService.handleNextNumber(
        client,
        intBranchId,
        intUserId,
      );

      // Emitir el evento desde el servidor hacia los clientes en el room
      const room = `branch-${branchId}`;
      this.server.to(room).emit('queue.updated', {
        message: 'Número avanzado',
        current_number: result.data.current_number,
      });
    } catch (error) {
      this.logger.error(
        `Error avanzando número en la sucursal ${intBranchId}`,
        error,
      );

      // Notificar al cliente en caso de error
      client.emit('error', {
        message:
          'No se pudo avanzar el número en la sucursal. Inténtalo más tarde.',
      });
    }
  }
}
