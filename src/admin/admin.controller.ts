import {
  Get,
  Body,
  Post,
  Param,
  Patch,
  Delete,
  Inject,
  Controller,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  UpdateUserDto,
  CreateUserDto,
  CreateCompanyDto,
  UpdateCompanyDto,
} from 'src/common';
import { NATS_SERVICES } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums';
import { throwError, catchError, firstValueFrom } from 'rxjs';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}
  // ✅✅❌

  // Gestión de usuarios

  // ✅✅✅✅ Listar usuarios
  @UseGuards(AuthGuard)
  @Get('usuarios')
  async getAllUsers() {
    return this.sendMessage('admin.getAllUsers', {});
  }

  // ✅✅✅✅ Obtener usuario por ID
  @UseGuards(AuthGuard)
  @Get('usuarios/:id')
  async getUserById(@Param('id') id: string) {
    return this.sendMessage('admin.getUserById', { id });
  }

  // Creacion de usuarios

  // ✅✅✅✅ Crear ADMIN_BUSINESS
  @UseGuards(AuthGuard)
  @Post('usuarios/admin-business')
  async createAdminBusiness(@Body() createUserDto: CreateUserDto) {
    return this.sendMessage('admin.createUser.adminBusiness', {
      createUserDto,
    });
  }

  // ✅✅✅✅ Crear ADMIN_BRANCH
  @UseGuards(AuthGuard)
  @Post('usuarios/admin-branch')
  async createAdminBranch(@Body() createUserDto: CreateUserDto) {
    return this.sendMessage('admin.createUser.adminBranch', {
      createUserDto,
    });
  }
  // ✅✅✅✅ Crear EXECUTIVE
  @UseGuards(AuthGuard)
  @Post('usuarios/ejecutivo/:moduleId')
  async createExecutive(
    @Body() createUserDto: CreateUserDto,
    @Param('moduleId') moduleId: string,
  ) {
    return this.sendMessage('admin.createUser.executive', {
      createUserDto,
      moduleId,
    });
  }

  // ✅✅✅✅ Actualizar usuario
  @UseGuards(AuthGuard)
  @Patch('usuarios/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.sendMessage('admin.updateUser', { updateUserDto, id });
  }

  // ✅✅✅✅ Eliminar usuario (lógico)
  @UseGuards(AuthGuard)
  @Delete('usuarios/:id')
  async deleteUser(@Param('id') id: string) {
    return this.sendMessage('admin.deleteUser', { id });
  }

  // Gestión de empresas

  // ✅✅✅✅ Listar empresas con sus Administradores
  @UseGuards(AuthGuard)
  @Get('empresas')
  async getAllCompanies() {
    return this.sendMessage('admin.getAllCompanies', {});
  }

  // ✅✅✅✅ Listar empresa by id con su Administrador
  @UseGuards(AuthGuard)
  @Get('empresas/:id')
  async getCompanyById(@Param('id') id: string) {
    return this.sendMessage('admin.getCompanyById', { id });
  }

  // ✅✅✅✅ Crear empresa
  @UseGuards(AuthGuard)
  @Post('empresas')
  async createCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.sendMessage('admin.createCompany', createCompanyDto);
  }

  // ✅✅✅✅ Actualizar empresa
  @UseGuards(AuthGuard)
  @Patch('empresas/:id')
  async updateCompany(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.sendMessage('admin.updateCompany', { id, updateCompanyDto });
  }

  // ✅✅✅✅ Eliminar empresa (lógico)
  @UseGuards(AuthGuard)
  @Delete('empresas/:id')
  async deleteCompany(@Param('id') id: string) {
    return this.sendMessage('admin.deleteCompany', { id });
  }

  // Gestión de roles (solo listado)

  // ✅✅✅✅ Listar roles
  @UseGuards(AuthGuard)
  @Get('roles')
  async getAllRoles() {
    return this.sendMessage('admin.getAllRoles', {});
  }

  // ✅✅✅✅ Dashboard y métricas
  @UseGuards(AuthGuard)
  @Get('dashboard')
  async getDashboardMetrics() {
    return this.sendMessage('admin.getDashboardMetrics', {});
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
