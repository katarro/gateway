import {
  Get,
  Param,
  Inject,
  Controller,
  BadRequestException,
} from '@nestjs/common';
import { NATS_SERVICES } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';

@Controller('cola')
export class QueueTimeController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  @Get('obtener-tiempo-en-cola/:queueId')
  async getTimeInQueue(@Param('queueId') queueId: string) {
    return this.sendMessage('client.getTimeInQueue', { queueId });
  }

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message ?? error));
  }

  private async sendMessage(pattern: string, data: any) {
    return await firstValueFrom(
      this.client.send(pattern, data).pipe(catchError(this.handleError)),
    );
  }
}
