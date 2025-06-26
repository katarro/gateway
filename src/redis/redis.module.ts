import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from 'src/config';
import Redis from 'ioredis';
import { envs } from 'src/config/envs';
import { RedisService } from './redis.service';
import { EventNotificationService } from './event-notification.service';

@Global()
@Module({
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
    RedisService,
    EventNotificationService,
  ],
  exports: [RedisService, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT],
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
