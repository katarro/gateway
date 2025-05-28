// Tokens de inyección para las interfaces
export const CONNECTION_MANAGER_TOKEN = Symbol('IConnectionManager');
export const CHANNEL_MANAGER_TOKEN = Symbol('IChannelManager');
export const MESSAGE_BROADCASTER_TOKEN = Symbol('IMessageBroadcaster');
export const CLEANUP_SERVICE_TOKEN = Symbol('ICleanupService');
export const REDIS_MESSAGE_HANDLER_TOKEN = Symbol('IRedisMessageHandler');
export const LOGGER_TOKEN = Symbol('ILogger');
export const METRICS_COLLECTOR_TOKEN = Symbol('IMetricsCollector');
export const SSE_CLIENT_FACTORY_TOKEN = Symbol('ISseClientFactory');

export const SUBSCRIBE_TO_QUEUE_COMMAND = Symbol('ISubscribeToQueueCommand');
