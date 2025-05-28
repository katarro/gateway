import { Injectable, Inject } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from 'src/auth/interfaces/current-user.interface';
import {
  ISseClientFactory,
  SseClient,
  ILogger,
  LOGGER_TOKEN,
} from '../interfaces';
import { CreateWelcomeMessageDto, WelcomeMessageDto } from '../dto';

/**
 * DTO para validar datos de entrada al crear cliente
 */
class CreateSseClientDto {
  user: CurrentUser;
  response: Response;

  constructor(user: CurrentUser, response: Response) {
    this.user = user;
    this.response = response;
  }
}

@Injectable()
export class SseClientFactory implements ISseClientFactory {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: ILogger) {}

  createClient(user: CurrentUser, res: Response): SseClient {
    // ✅ Validar parámetros usando DTO approach
    const createDto = new CreateSseClientDto(user, res);
    this.validateInputs(createDto);

    // Generar ID único para el cliente
    const clientId = this.generateClientId(user);

    // ✅ Crear objeto SseClient validado
    const client: SseClient = {
      id: clientId,
      user: user,
      res: res,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    // Validar que el cliente creado es válido
    if (!this.isClientValid(client)) {
      throw new Error('Error interno: Cliente SSE creado es inválido');
    }

    // Log de creación (útil para debugging)
    this.logger.debug('Cliente SSE creado', {
      clientId: client.id,
      userId: user.id,
      email: user.email,
      userAgent: res.req?.headers['user-agent'],
      ip: this.extractClientIP(res),
    });

    return client;
  }

  /**
   * ✅ Crear cliente con validación de mensaje de bienvenida
   */
  createClientWithWelcome(
    user: CurrentUser,
    res: Response,
    welcomeData: {
      queueId: string;
      ticketNumber?: number;
      estimatedWaitTime?: number;
      moduleCode?: string;
    },
  ): { client: SseClient; welcomeMessage: WelcomeMessageDto } {
    // Crear cliente
    const client = this.createClient(user, res);

    // ✅ Crear mensaje de bienvenida validado usando DTO
    const welcomeDto: CreateWelcomeMessageDto = {
      userEmail: user.email,
      queueId: welcomeData.queueId,
      ticketNumber: welcomeData.ticketNumber,
      estimatedWaitTime: welcomeData.estimatedWaitTime,
      moduleCode: welcomeData.moduleCode,
    };

    // Validar DTO (puedes usar class-validator aquí si quieres)
    const welcomeMessage = this.createValidatedWelcomeMessage(welcomeDto);

    return { client, welcomeMessage };
  }

  // 🔧 Métodos privados de utilidad
  private validateInputs(createDto: CreateSseClientDto): void {
    const { user, response: res } = createDto;

    if (!user) {
      throw new Error('Usuario es requerido para crear cliente SSE');
    }

    if (!user.id) {
      throw new Error('Usuario debe tener un ID válido');
    }

    if (!user.email) {
      throw new Error('Usuario debe tener un email válido');
    }

    if (!res) {
      throw new Error('Response es requerido para crear cliente SSE');
    }

    if (res.destroyed || res.writableEnded) {
      throw new Error(
        'Response ya está cerrado, no se puede crear cliente SSE',
      );
    }
  }

  private generateClientId(user: CurrentUser): string {
    // Formato: userId_timestamp_random
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    return `${user.id}_${timestamp}_${randomSuffix}`;
  }

  private extractClientIP(res: Response): string {
    const req = res.req;

    return (
      (req?.headers['x-forwarded-for'] as string) ||
      (req?.headers['x-real-ip'] as string) ||
      req?.connection?.remoteAddress ||
      req?.socket?.remoteAddress ||
      'unknown'
    );
  }

  private createValidatedWelcomeMessage(
    dto: CreateWelcomeMessageDto,
  ): WelcomeMessageDto {
    // Crear mensaje de bienvenida básico
    const welcome = new WelcomeMessageDto();
    welcome.message = `Hola ${dto.userEmail}, te has unido exitosamente a la cola.`;
    welcome.queueId = dto.queueId;
    welcome.userEmail = dto.userEmail;
    welcome.ticketNumber = dto.ticketNumber;
    welcome.estimatedWaitTime = dto.estimatedWaitTime;
    welcome.moduleCode = dto.moduleCode;
    welcome.timestamp = new Date().toISOString();

    return welcome;
  }

  // 🔍 Métodos adicionales útiles

  /**
   * Crear múltiples clientes de una vez (útil para testing o migración)
   */
  createMultipleClients(
    users: CurrentUser[],
    responses: Response[],
  ): SseClient[] {
    if (users.length !== responses.length) {
      throw new Error('Número de usuarios y responses debe ser igual');
    }

    return users.map((user, index) =>
      this.createClient(user, responses[index]),
    );
  }

  /**
   * ✅ Validar si un cliente está en buen estado usando approach más robusto
   */
  isClientValid(client: SseClient): boolean {
    try {
      return (
        client?.id &&
        client?.user?.id &&
        client?.res &&
        !client.res.destroyed &&
        !client.res.writableEnded &&
        client.res.writable &&
        client.connectedAt instanceof Date
      );
    } catch (error) {
      this.logger.warn('Error validando cliente', {
        clientId: client?.id,
        error: error?.message,
      });
      return false;
    }
  }

  /**
   * Obtener información resumida del cliente (para logs/debugging)
   */
  getClientSummary(client: SseClient): any {
    return {
      id: client.id,
      userId: client.user.id,
      email: client.user.email,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
      connectionDuration: Date.now() - client.connectedAt.getTime(),
      isAlive: this.isClientValid(client),
    };
  }

  /**
   * Clonar cliente (útil para testing o debugging)
   */
  cloneClient(original: SseClient, newResponse: Response): SseClient {
    this.logger.debug('Clonando cliente SSE', {
      originalId: original.id,
      userId: original.user.id,
    });

    return this.createClient(original.user, newResponse);
  }

  /**
   * ✅ Validar datos de entrada para crear mensaje de bienvenida
   */
  validateWelcomeData(data: any): data is CreateWelcomeMessageDto {
    return (
      data &&
      typeof data.userEmail === 'string' &&
      data.userEmail.includes('@') &&
      typeof data.queueId === 'string' &&
      data.queueId.length > 0
    );
  }
}
