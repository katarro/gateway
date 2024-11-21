import {
  Controller,
  Get,
  Inject,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, throwError } from 'rxjs';
import { NATS_SERVICES } from 'src/config';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('fila')
export class QueueRouterController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  private handleError(error: any) {
    return throwError(() => new BadRequestException(error.message || error));
  }

  private sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data).pipe(catchError(this.handleError));
  }



  // 2. Enrutar a la sucursal que elijo mediante id
  // @Post('ingresar/:id')
  // enterQueue(@Param('id', ParseIntPipe) branchId: number) {
  //   // Add your logic here
  // }
}
