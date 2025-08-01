import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from 'src/config';
import Redis from 'ioredis';
import { envs } from 'src/config/envs';
import { RedisService } from './redis.service';
import { EventNotificationService } from './event-notification.service';
import { LOGGER_TOKEN } from 'src/sse/interfaces';
import { LoggerService } from 'src/sse/services/logger.service';
import { TransportModule } from 'src/transport/transport.module';
import { SseService } from 'src/sse/sse.service';
import { SseModule } from 'src/sse/sse.module';

@Global()
@Module({
  imports: [TransportModule, SseModule],
  providers: [
    {
      provide: REDIS_PUB_CLIENT,
      useFactory: () => {
        const redisConfig = {
          host: envs.redis_host,
          port: Number(envs.redis_port),
          password: envs.redis_password,
          enableReadyCheck: true,
        };
        try {
          return new Redis(redisConfig);
        } catch (error) {
          throw new Error(
            `Fallo al crear el cliente de publicación de Redis: ${error.message}`,
          );
        }
      },
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: () => {
        const redisConfig = {
          host: envs.redis_host,
          port: Number(envs.redis_port),
          password: envs.redis_password,
          enableReadyCheck: true,
        };
        try {
          return new Redis(redisConfig);
        } catch (error) {
          throw new Error(
            `Fallo al crear el cliente de suscripción de Redis: ${error.message}`,
          );
        }
      },
    },
    {
      provide: LOGGER_TOKEN,
      useClass: LoggerService,
    },
    RedisService,
    EventNotificationService,
    LoggerService,
    SseService,
  ],
  exports: [
    RedisService,
    REDIS_PUB_CLIENT,
    REDIS_SUB_CLIENT,
    LOGGER_TOKEN,
    SseService,
  ],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subClient: Redis,
  ) {}

  async onApplicationShutdown(signal?: string) {
    if (signal) {
      console.log(
        `Recibida la señal de apagado: ${signal}. Cerrando los clientes de Redis...`,
      );
    }
    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
  }
}
