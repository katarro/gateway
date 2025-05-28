import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_SUB_CLIENT } from 'src/config';
import { IChannelManager, ILogger, LOGGER_TOKEN } from '../interfaces';

@Injectable()
export class ChannelService implements IChannelManager {
  private readonly subscribedChannels = new Set<string>();

  constructor(
    @Inject(REDIS_SUB_CLIENT) private readonly redis: Redis,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async subscribeToChannel(channel: string): Promise<void> {
    if (this.subscribedChannels.has(channel)) {
      this.logger.debug(`Ya suscrito a canal`, { channel });
      return;
    }

    try {
      await this.redis.subscribe(channel);
      this.subscribedChannels.add(channel);
      this.logger.info(`Suscrito a nuevo canal`, { channel });
    } catch (error) {
      this.logger.error(`Error suscribiéndose a canal`, error, { channel });
      throw error;
    }
  }

  async unsubscribeFromChannel(channel: string): Promise<void> {
    if (!this.subscribedChannels.has(channel)) {
      this.logger.debug(`No estaba suscrito a canal`, { channel });
      return;
    }

    try {
      await this.redis.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
      this.logger.info(`Desuscrito de canal`, { channel });
    } catch (error) {
      this.logger.error(`Error desuscribiéndose de canal`, error, { channel });
      throw error;
    }
  }

  async unsubscribeFromAll(): Promise<void> {
    if (this.subscribedChannels.size === 0) return;

    const channels = Array.from(this.subscribedChannels);
    try {
      await this.redis.unsubscribe(...channels);
      this.subscribedChannels.clear();
      this.logger.info(`Desuscrito de todos los canales`, {
        count: channels.length,
      });
    } catch (error) {
      this.logger.error(`Error desuscribiéndose de todos los canales`, error);
      throw error;
    }
  }

  isSubscribed(channel: string): boolean {
    return this.subscribedChannels.has(channel);
  }

  getSubscribedChannels(): string[] {
    return Array.from(this.subscribedChannels);
  }

  getSubscriptionCount(): number {
    return this.subscribedChannels.size;
  }

  // Helpers para generar nombres de canales consistentes
  static generateQueueChannel(queueId: string): string {
    return `queue:${queueId}`;
  }

  static generateUserChannel(userId: string): string {
    return `user:${userId}`;
  }

  static generateGlobalChannel(): string {
    return 'global:notifications';
  }
}
