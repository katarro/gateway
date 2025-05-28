import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  CreateBranchDto,
  CreateUserDto,
  UpdateBranchDto,
  UpdateUserDto,
} from 'src/common';
import { NATS_SERVICES } from 'src/config';

@Controller('admin-empresa')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN_BUSINESS)
export class AdminBusinessController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  // Gestion de sucursales

  // ✅✅✅✅ Todas las scurusales asociadas a un Admin_Business
  @UseGuards(AuthGuard)
  @Get('sucursales/admin')
  async getAllBranches(@User() user: any) {
    return this.sendMessage('admin.business.getAllBranches', user.id);
  }

  // ✅✅✅✅ Obtener una sucursal por id
  @UseGuards(AuthGuard)
  @Get('sucursales/:idBranch')
  async getBranchById(@Param('idBranch') idBranch: string, @User() user: any) {
    console.log('usuario', user);
    return this.sendMessage('admin.business.getBranchById', {
      idBranch,
      userId: user.id,
    });
  }

  // ✅✅✅✅ Crear una sucursal, asignandole un administrador de sucursal
  @UseGuards(AuthGuard)
  @Post('sucursales')
  async createBranch(
    @Body() createBranchDto: CreateBranchDto,
    @User() user: any,
  ) {
    return this.sendMessage('admin.business.createBranch', {
      createBranchDto,
      userId: user.id,
    });
  }

  // ✅✅✅✅ Actualizar una sucursal
  @UseGuards(AuthGuard)
  @Patch('sucursales/:idBranch')
  async updateBranch(
    @Param('idBranch') idBranch: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return this.sendMessage('admin.business.updateBranch', {
      updateBranchDto,
      idBranch,
    });
  }

  // ✅✅✅✅ Eliminar (lógico) una sucursal
  @UseGuards(AuthGuard)
  @Delete('sucursales/:idBranch')
  async deleteBranch(@Param('idBranch') idBranch: string) {
    return this.sendMessage('admin.business.deleteBranch', idBranch);
  }

  // Gestion de administradores de sucursales

  // ✅✅✅✅ Actualizar un administrador de sucursal
  @UseGuards(AuthGuard)
  @Patch('admin-sucursales/:idAdminBranch')
  async updateBranchAdmin(
    @User() user: any,
    @Param('idAdminBranch') idAdminBranch: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.sendMessage('admin.business.updateBranchAdmin', {
      idAdminBranch,
      updateUserDto,
      idAdminBusiness: user.id,
    });
  }

  // ✅✅✅✅ Obtener ADMIN_BRANCH y las sucursales que administran, de la empresa del ADMIN_BUSINESS
  @UseGuards(AuthGuard)
  @Get('admin-sucursales')
  async getAllBranchAdmins(@User() user: any) {
    console.log('user', user);
    return this.sendMessage('admin.business.getAllBranchAdmins', user.id);
  }

  // ✅✅✅✅ Crear un administrador de sucursal, asociado con la empresa del ADMIN_BUSINESS
  @UseGuards(AuthGuard)
  @Post('admin-sucursales')
  async createBranchAdmin(
    @Body() createUserDto: CreateUserDto,
    @User() user: any,
  ) {
    return this.sendMessage('admin.business.createBranchAdmin', {
      createUserDto,
      userId: user.id,
    });
  }

  // ✅✅✅✅  Métricas de empresa
  @UseGuards(AuthGuard)
  @Get('metricas')
  async getBusinessMetrics(@User() user: any) {
    return this.sendMessage('admin.business.getBusinessMetrics', user.id);
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
