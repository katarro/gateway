import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Rol } from '../enums';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('NATS_SERVICES') private readonly client: ClientProxy, // Inyecta tu cliente de NATS
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('Roles requeridos:', requiredRoles);

    if (!requiredRoles) {
      return true; // Si no hay roles requeridos, permitir acceso.
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }

    try {
      // Verifica el token usando el servicio NATS
      const { user } = await firstValueFrom(
        this.client.send('verify_token', token),
      );

      console.log('Usuario obtenido:', user.rol);

      // Validar si el rol del usuario coincide con los roles requeridos
      return requiredRoles.some((role) => user.rol === role);

      
    } catch (error) {
      console.error('Error al verificar el token:', error.message);
      throw new UnauthorizedException('Token inválido o no autorizado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
