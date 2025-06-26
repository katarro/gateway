// ============================================
// ARCHIVO: src/redis/redis.service.ts
// ============================================

import { Inject, Injectable } from '@nestjs/common';
import { REDIS_PUB_CLIENT } from 'src/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_PUB_CLIENT) private readonly redis: Redis) {}

  // ✅ Agregar usuario a una cola del servicio
  async addUserToQueue(queueId: string, userId: string) {
    const key = `queue:${queueId}`;
    await this.redis.sadd(key, userId);
    console.log(`➕ Usuario ${userId} agregado a ${key}`);
  }

  // ✅ Eliminar usuario de cola
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

  // ✅ Obtener usuarios de una cola
  async getUsersInQueue(queueId: string): Promise<string[]> {
    const key = `queue:${queueId}`;
    return await this.redis.smembers(key);
  }

  // ✅ MÉTODO ESPECÍFICO: Contar usuarios en cola
  async getUserCountInQueue(queueId: string): Promise<number> {
    const key = `queue:${queueId}`;
    const count = await this.redis.scard(key);
    console.log(`📊 Usuarios en cola ${queueId}: ${count}`);
    return count;
  }

  // ✅ Obtener tiempo de espera estimado
  async getWaitTime(queueId: string): Promise<number> {
    const key = `queue:${queueId}`;
    const userCount = await this.redis.scard(key);
    const waitTimePerUser = 5; // en minutos
    return userCount * waitTimePerUser;
  }

  // ✅ Verificar si una cola existe
  async queueExists(queueId: string): Promise<boolean> {
    const key = `queue:${queueId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  // ✅ Guardar ticket completado en ZSET de Redis
  async addCompletedTicket(queueId: string, ticketData: any): Promise<void> {
    const today = this.getTodayDateKey();
    const completedTicketsKey = `queue:${queueId}:completed:${today}`;

    // ✅ Crear objeto con datos del ticket completado
    const ticketRecord = {
      ticketId: ticketData.id,
      ticketNumber: ticketData.ticketNumber,
      completedAt: new Date().toISOString(),
      completedBy: ticketData.executiveId || ticketData.userId,
      queueId: queueId,
      serviceTime: ticketData.serviceTime || null,
      satisfaction: ticketData.satisfaction || null,
    };

    // ✅ Guardar en ZSET con score = timestamp para ordenar
    const timestamp = Date.now();
    await this.redis.zadd(
      completedTicketsKey,
      timestamp,
      JSON.stringify(ticketRecord),
    );

    // ✅ Expirar al final del día siguiente (48 horas para seguridad)
    await this.redis.expire(completedTicketsKey, 172800);

    console.log(`✅ Ticket completado guardado en Redis:`, {
      key: completedTicketsKey,
      ticketId: ticketData.id,
      ticketNumber: ticketData.ticketNumber,
    });
  }

  // ✅ Obtener cantidad de tickets completados hoy desde ZSET
  async getCompletedTicketsCountToday(queueId: string): Promise<number> {
    const today = this.getTodayDateKey();
    const completedTicketsKey = `queue:${queueId}:completed:${today}`;

    const count = await this.redis.zcard(completedTicketsKey);
    console.log(`📊 Tickets completados hoy en cola ${queueId}: ${count}`);
    return count;
  }

  // ✅ Obtener lista de tickets completados hoy
  async getCompletedTicketsToday(queueId: string): Promise<any[]> {
    const today = this.getTodayDateKey();
    const completedTicketsKey = `queue:${queueId}:completed:${today}`;

    // ✅ Obtener todos los tickets ordenados por timestamp (más recientes primero)
    const tickets = await this.redis.zrevrange(completedTicketsKey, 0, -1);

    return tickets
      .map((ticketJson) => {
        try {
          return JSON.parse(ticketJson);
        } catch (error) {
          console.error('Error parseando ticket completado:', error);
          return null;
        }
      })
      .filter(Boolean);
  }

  // ✅ Limpiar colas huérfanas
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

  // ✅ Métodos básicos de Redis
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  // ✅ Métodos privados de utilidad
  private getTodayDateKey(): string {
    return this.formatDateKey(new Date());
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}
