import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('NATS_SERVICES') private readonly client: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const token =
      this.extractTokenFromHeader(request) ||
      this.extractTokenFromCookie(request); // 👈 agregamos cookie fallback

    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }

    try {
      const { user } = await firstValueFrom(
        this.client.send('public.verify.token', token),
      );

      request['user'] = user; // 👈 opcional: útil para el controlador

      const hasRole = requiredRoles.includes(user.role);

      if (!hasRole) {
        throw new UnauthorizedException('No tienes permiso');
      }

      return true;
    } catch (error) {
      console.error('❌ RolesGuard error:', error.message);
      throw new UnauthorizedException('Error al verificar token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.access_token;
  }
}
