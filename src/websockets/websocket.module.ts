import { Global, Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { TransportModule } from 'src/transport/transport.module';
import { WebsocketService } from './websocket.service';

@Global()
@Module({
  providers: [WebsocketGateway, WebsocketService],
  imports: [TransportModule],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
