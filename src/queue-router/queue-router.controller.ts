import {
  Get,
  Param,
  Inject,
  Logger,
  UseGuards,
  Controller,
  ParseIntPipe,
  BadRequestException,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { Role } from 'src/auth/enums';
import { NATS_SERVICES } from 'src/config';
import { throwError, catchError } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('cola')
export class QueueRouterController {
  private readonly logger = new Logger('Controller Gateway');
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Get('obtener-colas')
  getQueues(@Query('page') page: string, @Query('limit') limit: string) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    return this.sendMessage('get.queues', {
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Post('opinion/:userId')
  giveOpinion(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() opinionDto: { opinion: string },
  ) {
    return this.sendMessage('give.opinion', {
      opinion: opinionDto.opinion,
      userId,
    });
  }

  @Get('opiniones')
  getOpinions() {
    return this.sendMessage('get.opinions', {});
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Client)
  @Get('mi-posicion/:branchId/:userId')
  getUserQueuePosition(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.sendMessage('get.position.in.queue', { branchId, userId });
  }

  @UseGuards(AuthGuard)
  @Get('obtener-cola/:branchId')
  getQueueByBranchId(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.sendMessage('get.queue.by.branchId', branchId);
  }

  private handleError(error: any) {
    return throwError(
      () => new BadRequestException(error.message || error, error.status),
    );
  }

  private sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data).pipe(catchError(this.handleError));
  }
}
