import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { NATS_SERVICES } from 'src/config';

@Injectable()
export class TicketService {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  async validateTicketRemote(
    ticketId: string,
    userId: string,
    queueId: string,
  ) {
    const validate = await this.sendMessage('sse.validateTicket', {
      ticketId,
      userId,
      queueId,
    });

    console.log('Validate:', validate);
    return validate;
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
