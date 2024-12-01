import {
  ConnectedSocket,
  WebSocketServer,
  WebSocketGateway,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  JOIN_QUEUE,
  GET_NEW_NUMBER,
  USER_LEFT_QUEUE,
  EXECUTIVE_NEXT_NUMBER,
} from 'src/config';
import {
  JoinQueue,
  LeftQueue,
  NextNumber,
  GetNewNumber,
  EventEmitRoom,
  ConnectionRoom,
  DisconnectionRoom,
} from './commands';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@WebSocketGateway({
  namespace: '/api/ws/cola',
  cors: { origin: '*' },
})
export class WebsocketGateway implements OnModuleInit {
  private static isInitialized = false;
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly joinQueue: JoinQueue,
    private readonly leftQueue: LeftQueue,
    private readonly getNewNumber: GetNewNumber,
    private readonly nextNumber: NextNumber,
    private readonly eventEmitRoom: EventEmitRoom,
    private readonly connectionRoom: ConnectionRoom,
    private readonly disconnectionRoom: DisconnectionRoom,
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
    this.eventEmitRoom.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    return this.connectionRoom.execute(client);
  }

  async handleDisconnect(client: Socket) {
    return this.disconnectionRoom.execute(client);
  }

  @SubscribeMessage(JOIN_QUEUE)
  async handleJoinQueue(@ConnectedSocket() client: Socket) {
    return await this.joinQueue.execute(client);
  }

  @SubscribeMessage(USER_LEFT_QUEUE)
  async handleLeftQueue(@ConnectedSocket() client: Socket) {
    return await this.leftQueue.execute(client);
  }

  @SubscribeMessage(GET_NEW_NUMBER)
  async handleGetNewNumber(@ConnectedSocket() client: Socket) {
    return await this.getNewNumber.execute(client);
  }

  @SubscribeMessage(EXECUTIVE_NEXT_NUMBER)
  async handleNextNumber(@ConnectedSocket() client: Socket) {
    return await this.nextNumber.execute(client);
  }
}
