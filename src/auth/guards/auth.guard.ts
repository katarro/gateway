import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { NATS_SERVICES } from 'src/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 🔧 NUEVO: Buscar token desde múltiples fuentes
    const token = this.extractTokenFromMultipleSources(request);

    console.log('🔍 Fuentes de token verificadas:', {
      hasQueryToken: !!request.query?.token,
      hasHeaderToken: !!this.extractTokenFromHeader(request),
      hasCookieToken: !!this.extractTokenFromCookie(request),
      finalToken: !!token,
    });

    if (!token) {
      console.log('❌ No se encontró token en ninguna fuente');
      throw new UnauthorizedException('Token no encontrado');
    }

    try {
      const { user, token: newToken } = await this.sendMessage(
        'public.verify.token',
        token,
      );

      request['user'] = user;
      request['token'] = newToken;

      console.log('✅ Token validado correctamente:', {
        userId: user?.id,
        email: user?.email,
      });
    } catch (error) {
      console.error('❌ Error validando token:', error);
      throw new UnauthorizedException('Token inválido');
    }

    return true;
  }

  // 🔧 NUEVA FUNCIÓN: Buscar token desde múltiples fuentes
  private extractTokenFromMultipleSources(
    request: Request,
  ): string | undefined {
    // 1️⃣ PRIORIDAD 1: Query parameter 'token' (para SSE)
    if (request.query?.token && typeof request.query.token === 'string') {
      console.log('🎯 Token encontrado en query parameter');
      return request.query.token;
    }

    // 2️⃣ PRIORIDAD 2: Authorization header (para peticiones normales)
    const headerToken = this.extractTokenFromHeader(request);
    if (headerToken) {
      console.log('🎯 Token encontrado en Authorization header');
      return headerToken;
    }

    // 3️⃣ PRIORIDAD 3: Cookie (fallback)
    const cookieToken = this.extractTokenFromCookie(request);
    if (cookieToken) {
      console.log('🎯 Token encontrado en cookie');
      return cookieToken;
    }

    return undefined;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.access_token;
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
