import { Global, Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { TransportModule } from 'src/transport/transport.module';
import {
  LeftQueue,
  LeftQueueDb,
  RecordNumberDb,
  LeftQueueRoom,
  EventEmitRoom,
  GetNewNumber,
  NextNumber,
  EventEmitDb,
  JoinQueue,
  ConnectionRoom,
  DisconnectionRoom
} from './commands';
import { UserInQueue, HandleErrorValidator } from './validators';

const providers = [
  LeftQueue,
  LeftQueueDb,
  RecordNumberDb,
  LeftQueueRoom,
  EventEmitRoom,
  GetNewNumber,
  NextNumber,
  EventEmitDb,
  JoinQueue,
  ConnectionRoom,
  DisconnectionRoom
];

const validators = [UserInQueue, HandleErrorValidator];

@Global()
@Module({
  providers: [WebsocketGateway, ...providers, ...validators],
  imports: [TransportModule],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
