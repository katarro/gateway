export interface IMetricsCollector {
  incrementConnection(queueId: string): void;
  decrementConnection(queueId: string): void;
  recordMessageSent(queueId: string): void;
  recordError(operation: string, error: Error): void;
  getMetrics(): any;
}
