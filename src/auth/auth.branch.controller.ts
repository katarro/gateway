import {
  Get,
  Body,
  Post,
  Param,
  Patch,
  Inject,
  Delete,
  UseGuards,
  Controller,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { Role } from './enums';
import { Token } from './decorators';
import { NATS_SERVICES } from 'src/config';
import { catchError, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './decorators/roles.decorator';
import { CreateBranchDto, UpdateBranchDto } from 'src/common/dto';

@Controller('auth/sucursales')
export class AuthBranchController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Post('registrar')
  async registrarSucursal(
    @Body() createBranchDto: CreateBranchDto,
    @Token() token: string,
  ) {
    return this.sendMessage('register.branch.auth', {
      createBranchDto,
      token,
    });
  }

  // @UseGuards(AuthGuard)
  @Get('obtener-sucursales')
  getBranches() {
    return this.sendMessage('get.branches', {});
  }

  // @UseGuards(AuthGuard)
  @Get('obtener-sucursal/:id')
  getBranchById(@Param('id', ParseIntPipe) id: number) {
    return this.sendMessage('get.branch.by.id', { id });
  }

  // @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Delete('eliminar/:id')
  deleteBranch(@Param('id', ParseIntPipe) id: number) {
    return this.sendMessage('delete.branch', id);
  }

  // @UseGuards(AuthGuard)
  // @Roles(Role.Admin)
  @Patch('actualizar/:id')
  updateBranch(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return this.sendMessage('update.branch', { id, updateBranchDto });
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
