import { Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { TicketService } from './ticket.service';
import { TransportModule } from 'src/transport/transport.module';
import { SubscribeToQueueCommand } from './command/subscribe-to-queue.command';

// Services
import { ConnectionService } from './services/connection.service';
import { ChannelService } from './services/channel.service';
import { MessageBroadcasterService } from './services/message-broadcaster.service';
import { CleanupService } from './services/cleanup.service';
import { LoggerService } from './services/logger.service';
import { MetricsService } from './services/metrics.service';

// Handlers
import { MessageHandlerService } from './handlers/message-handler.service';
import { TicketCalledHandler } from './handlers/ticket-called.handler';
import { UserLeftHandler } from './handlers/user-left.handler';
import { SystemNotificationHandler } from './handlers/system-notification.handler';

// Factories
import { SseClientFactory } from './factories/sse-client.factory';
import { MessageFactory } from './factories/message.factory';

// Tokens
import {
  CONNECTION_MANAGER_TOKEN,
  CHANNEL_MANAGER_TOKEN,
  MESSAGE_BROADCASTER_TOKEN,
  CLEANUP_SERVICE_TOKEN,
  LOGGER_TOKEN,
  METRICS_COLLECTOR_TOKEN,
  REDIS_MESSAGE_HANDLER_TOKEN,
  SSE_CLIENT_FACTORY_TOKEN,
  SUBSCRIBE_TO_QUEUE_COMMAND,
} from './interfaces';
import { SseSubscriptionExecutiveService } from './services/sse-subscription-executive.service';
import { EventNotificationService } from 'src/redis/event-notification.service';

@Module({
  providers: [
    // Servicios existentes (mantener)
    SseService,
    TicketService,
    SubscribeToQueueCommand,
    SseSubscriptionExecutiveService,
    EventNotificationService,

    // Nuevos servicios con sus tokens
    {
      provide: CONNECTION_MANAGER_TOKEN,
      useClass: ConnectionService,
    },
    {
      provide: CHANNEL_MANAGER_TOKEN,
      useClass: ChannelService,
    },
    {
      provide: MESSAGE_BROADCASTER_TOKEN,
      useClass: MessageBroadcasterService,
    },
    {
      provide: CLEANUP_SERVICE_TOKEN,
      useClass: CleanupService,
    },
    {
      provide: LOGGER_TOKEN,
      useClass: LoggerService,
    },
    {
      provide: METRICS_COLLECTOR_TOKEN,
      useClass: MetricsService,
    },
    {
      provide: REDIS_MESSAGE_HANDLER_TOKEN,
      useClass: MessageHandlerService,
    },
    {
      provide: SSE_CLIENT_FACTORY_TOKEN,
      useClass: SseClientFactory,
    },
    {
      provide: SUBSCRIBE_TO_QUEUE_COMMAND,
      useClass: SubscribeToQueueCommand,
    },

    // Handlers
    TicketCalledHandler,
    UserLeftHandler,
    SystemNotificationHandler,

    // Factories (también como clases directas)
    SseClientFactory,
    MessageFactory,

    // También registrar las clases directamente para casos donde se necesiten
    ConnectionService,
    ChannelService,
    MessageBroadcasterService,
    CleanupService,
    LoggerService,
    MetricsService,
    MessageHandlerService,
  ],
  controllers: [SseController],
  imports: [TransportModule],
  exports: [
    SseService,
    SubscribeToQueueCommand,
    // Exportar tokens para que otros módulos puedan usarlos
    CONNECTION_MANAGER_TOKEN,
    CHANNEL_MANAGER_TOKEN,
    MESSAGE_BROADCASTER_TOKEN,
    CLEANUP_SERVICE_TOKEN,
    LOGGER_TOKEN,
    METRICS_COLLECTOR_TOKEN,
    REDIS_MESSAGE_HANDLER_TOKEN,
    SSE_CLIENT_FACTORY_TOKEN,
    SUBSCRIBE_TO_QUEUE_COMMAND,
  ],
})
export class SseModule {}
