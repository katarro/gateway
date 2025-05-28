import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { throwError, catchError, firstValueFrom } from 'rxjs';
import { User } from 'src/auth/decorators';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  CreateModuleWithQueueDto,
  CreateUserDto,
  UpdateQueueDto,
} from 'src/common/';
import { NATS_SERVICES } from 'src/config';

@Controller('admin-sucursal')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN_BRANCH)
export class AdminBranchController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  // Gestion de filas
  // ✅✅✅✅ Listar filas
  @Get('filas')
  getAllQueues(@User() user: any) {
    console.log('user', user);
    return this.sendMessage('admin.branch.getAllQueues', user.id);
  }

  @Patch('filas/:id')
  async updateQueue(
    @Param('id') id: string,
    @Body() updateQueueDto: UpdateQueueDto,
  ) {
    return this.sendMessage('admin.branch.updateQueue', { id, updateQueueDto });
  }

  // Gestión de puntos de atención

  // ✅✅✅✅ Listar puntos de atención
  @Get('puntos-atencion')
  async getAllServicesModules(@User() user: any) {
    return this.sendMessage('admin.branch.getAllServicesModules', user.id);
  }

  //✅✅✅✅ Crear punto de atención con cola
  @Post('puntos-atencion')
  async createModuleWithQueue(
    @Body() dto: CreateModuleWithQueueDto,
    @User() user: any,
  ) {
    return this.sendMessage('admin.branch.createModuleWithQueue', {
      dto,
      userId: user.id,
    });
  }

  //  Gestión de ejecutivos

  // ✅✅✅✅ Listar ejecutivos
  @Get('ejecutivos')
  async getAllExecutives(@User() user: any) {
    return this.sendMessage('admin.branch.getAllExecutives', user.id);
  }

  // ✅✅✅✅ Crear ejecutivo para una sucursal
  @Post('ejecutivo')
  async createExecutive(
    @Body() createUserDto: CreateUserDto,
    @User() user: any,
  ) {
    console.log('createUserDto', createUserDto);
    console.log('user', user);
    return this.sendMessage('admin.branch.createExecutive', {
      createUserDto,
      userId: user.id,
    });
  }

  // ✅✅❌❌ Métricas de sucursal
  @Get('metricas')
  async getBranchMetrics(@User() user: any) {
    return this.sendMessage('admin.branch.getBranchMetrics', user.id);
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
