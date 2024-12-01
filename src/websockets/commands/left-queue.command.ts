import { Inject, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { LeftQueueDb } from './left-queue-db.command';
import { RecordNumberDb } from './record-number-db.command';
import { LeftQueueRoom } from './left-queue-room.command';
import { EventEmitRoom } from './event-emit-room.command';
import { CACHE_MANAGER } from 'src/config';
import { Cache } from 'cache-manager';

@Injectable()
export class LeftQueue {
  private readonly logger = new Logger();
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmit: EventEmitRoom,
    private readonly leftQueueDb: LeftQueueDb,
    private readonly leftQueueRoom: LeftQueueRoom,
    private readonly recordNumberDb: RecordNumberDb,
  ) {}

  async execute(client: Socket) {
    try {
      const { branchId, userId } = client.handshake.query as {
        branchId: string;
        userId: string;
      };

      if (!branchId || !userId) {
        this.logger.error('Branch ID or User ID no encontrado');
        return;
      }

      const room = `branch-${branchId}`;
      const intBranchId = parseInt(branchId, 10);
      const intUserId = parseInt(userId, 10);

      await Promise.all([
        this.recordNumberDb.execute(intBranchId, intUserId),
        this.leftQueueDb.execute(intBranchId, intUserId),
        this.leftQueueRoom.execute(client, intUserId, room),
        this.eventEmit.execute(room, intBranchId, intUserId),
        this.cacheManager.del(userId),
      ]);
    } catch (error) {
      this.logger.error('Error handling left queue', error);
    }
  }
}
