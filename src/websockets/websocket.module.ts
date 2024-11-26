import { Global, Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { TransportModule } from 'src/transport/transport.module';

@Global()
@Module({
  providers: [WebsocketGateway],
  imports: [TransportModule],
  exports: [WebsocketGateway]
})
export class WebsocketModule {}
