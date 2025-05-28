import { Inject, Injectable } from '@nestjs/common';
import { REDIS_PUB_CLIENT } from 'src/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_PUB_CLIENT) private readonly redis: Redis) {}

  // Agregar usuario a una cola
  async addUserToQueue(queueId: string, userId: string) {
    const key = `queue:${queueId}`;
    await this.redis.sadd(key, userId);
    console.log(`➕ Usuario ${userId} agregado a ${key}`);
  }

  // Eliminar usuario
  async removeUserFromQueue(queueId: string, userId: string) {
    const key = `queue:${queueId}`;
    console.log(`➡️ Intentando eliminar ${userId} de ${key}`);

    const current = await this.redis.smembers(key);
    console.log('🔍 Contenido actual del set:', current);

    const removed = await this.redis.srem(key, userId);
    console.log(`🗑 Usuarios eliminados: ${removed}`);

    const remaining = await this.redis.scard(key);
    if (remaining === 0) {
      await this.redis.del(key);
      console.log(`✅ Clave ${key} eliminada (cola vacía)`);
    } else {
      console.log(`👥 Quedan ${remaining} usuarios en ${key}`);
    }

    return removed > 0;
  }

  // Obtener usuarios de una cola
  async getUsersInQueue(queueId: string): Promise<string[]> {
    const key = `queue:${queueId}`;
    return await this.redis.smembers(key);
  }

  // LLAMAR LA API DE INTELIGENCIA ARTIFICIAL PARA OBTENER EL TIEMPO DE ESPERA
  async getWaitTime(queueId: string): Promise<number> {
    const key = `queue:${queueId}`;
    const userCount = await this.redis.scard(key);
    const waitTimePerUser = 5; // en minutos
    return userCount * waitTimePerUser;
  }

  // Obtener todos los queueIds activos en Redis
  async getAllActiveQueueIds(): Promise<string[]> {
    const keys = await this.redis.keys('queue:*');
    return keys
      .filter((key) => !key.includes(':temp:')) // excluir claves temporales
      .map((key) => key.split(':')[1]);
  }

  // 🔧 Verificar si una cola existe
  async queueExists(queueId: string): Promise<boolean> {
    const key = `queue:${queueId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  // 🔧 Contar usuarios en cola
  async getUserCountInQueue(queueId: string): Promise<number> {
    const key = `queue:${queueId}`;
    return await this.redis.scard(key);
  }

  // 📢 Publicar evento de ticket eliminado (opcional)
  async publishTicketDeleted(queueId: string, data: any): Promise<void> {
    const channel = `queue:${queueId}`;
    const message = JSON.stringify({
      type: 'ticket_deleted',
      ...data,
    });

    await this.redis.publish(channel, message);
    console.log(`📢 Evento ticket_deleted publicado en ${channel}`);
  }

  // 📢 Publicar mensaje genérico a cola
  async publishToQueue(queueId: string, data: any): Promise<void> {
    const channel = `queue:${queueId}`;
    const message = JSON.stringify(data);

    await this.redis.publish(channel, message);
    console.log(`📢 Mensaje publicado en ${channel}:`, data);
  }

  // 🔧 Limpiar colas huérfanas (sin usuarios)
  async cleanupEmptyQueues(): Promise<string[]> {
    const allKeys = await this.redis.keys('queue:*');
    const emptyQueues: string[] = [];

    for (const key of allKeys) {
      const count = await this.redis.scard(key);
      if (count === 0) {
        await this.redis.del(key);
        emptyQueues.push(key);
        console.log(`🧹 Limpiada cola vacía: ${key}`);
      }
    }

    return emptyQueues;
  }
}
