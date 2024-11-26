import {
  BadRequestException,
  // Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  // Post,
  // UseGuards,
} from '@nestjs/common';
import { NATS_SERVICES, WS_QUEUE_UPDATED } from 'src/config';
import { throwError, catchError, firstValueFrom } from 'rxjs';
// import { JoinQueueDto } from 'src/common/dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { WebsocketGateway } from 'src/websockets/websocket.gateway';
// import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('cola')
export class QueueRouterController {
  private readonly logger = new Logger('Controller Gateway');
  constructor(
    @Inject(NATS_SERVICES) private readonly client: ClientProxy,
    private readonly wsGateway: WebsocketGateway,
  ) {}

  private handleError(error: any) {
    return throwError(
      () => new BadRequestException(error.message || error, error.status),
    );
  }

  private sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data).pipe(catchError(this.handleError));
  }

  // @UseGuards(AuthGuard)
  // @Post('unirse/:sucursalId')
  // async joinQueue(
  //   @Param('sucursalId', ParseIntPipe) branchId: number,
  //   @Body() body: JoinQueueDto,
  // ) {
  //   const { userId } = body;
  //   return this.sendMessage('join.queue', { branchId, userId });
  // }

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Get('obtener-colas')
  getQueues() {
    return this.sendMessage('get.queues', {});
  }

  @Get('mi-posicion/:branchId/:userId')
  getUserQueuePosition(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.sendMessage('get.position.in.queue', { branchId, userId });
  }

  // websocket
  @Get('obtener-cola/:branchId')
  getQueueByBranchId(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.sendMessage('get.queue.by.branchId', branchId);
  }

  // websocket, solo envio un evento, que escuchan los clientes conectados
  @Delete('salir/:branchId/:userId')
  async getOutQueue(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    try {
      const result = await firstValueFrom(
        this.sendMessage('get.out.queue', { branchId, userId }),
      );

      this.wsGateway.removeFromQueue(branchId, userId);

      this.wsGateway.emitEventUserLeftQueue(WS_QUEUE_UPDATED, { branchId });

      return {
        status: 'success',
        message: 'Usuario eliminado de la cola y notificación enviada.',
        data: result,
      };
    } catch (error) {
      const errorMessage = error?.message || 'Error al procesar la solicitud.';
      this.logger.error(`Error al salir de la cola: ${errorMessage}`);
      throw new RpcException({
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });
    }
  }

  // Cuando un usuario sale de cola, emitir un evento
  // para actualizar el numero de cada usuario en tiempo real.
  // uso de socekt

  // Notificar llegada al turno, cuando le falten 3 numeros para ser atendido
}
