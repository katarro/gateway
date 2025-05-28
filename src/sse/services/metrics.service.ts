import { Injectable } from '@nestjs/common';
import { IMetricsCollector } from '../interfaces';

interface QueueMetrics {
  connections: number;
  messagesSent: number;
  errors: number;
}

interface ErrorMetric {
  operation: string;
  count: number;
  lastError: Date;
  lastErrorMessage: string;
}

@Injectable()
export class MetricsService implements IMetricsCollector {
  private readonly queueMetrics = new Map<string, QueueMetrics>();
  private readonly errorMetrics = new Map<string, ErrorMetric>();
  private startTime = new Date();

  incrementConnection(queueId: string): void {
    const metrics = this.getOrCreateQueueMetrics(queueId);
    metrics.connections++;
  }

  decrementConnection(queueId: string): void {
    const metrics = this.getOrCreateQueueMetrics(queueId);
    metrics.connections = Math.max(0, metrics.connections - 1);
  }

  recordMessageSent(queueId: string): void {
    const metrics = this.getOrCreateQueueMetrics(queueId);
    metrics.messagesSent++;
  }

  recordError(operation: string, error: Error): void {
    // Métricas por cola
    const queueId = this.extractQueueFromOperation(operation);
    if (queueId) {
      const metrics = this.getOrCreateQueueMetrics(queueId);
      metrics.errors++;
    }

    // Métricas por tipo de error
    const errorMetric = this.errorMetrics.get(operation) || {
      operation,
      count: 0,
      lastError: new Date(),
      lastErrorMessage: '',
    };

    errorMetric.count++;
    errorMetric.lastError = new Date();
    errorMetric.lastErrorMessage = error.message;
    this.errorMetrics.set(operation, errorMetric);
  }

  getMetrics(): any {
    const totalConnections = Array.from(this.queueMetrics.values()).reduce(
      (sum, metrics) => sum + metrics.connections,
      0,
    );

    const totalMessagesSent = Array.from(this.queueMetrics.values()).reduce(
      (sum, metrics) => sum + metrics.messagesSent,
      0,
    );

    const totalErrors = Array.from(this.queueMetrics.values()).reduce(
      (sum, metrics) => sum + metrics.errors,
      0,
    );

    return {
      uptime: Date.now() - this.startTime.getTime(),
      startTime: this.startTime,
      totals: {
        connections: totalConnections,
        messagesSent: totalMessagesSent,
        errors: totalErrors,
        queues: this.queueMetrics.size,
      },
      queues: this.getQueueMetrics(),
      errors: this.getErrorMetrics(),
    };
  }

  private getOrCreateQueueMetrics(queueId: string): QueueMetrics {
    let metrics = this.queueMetrics.get(queueId);
    if (!metrics) {
      metrics = {
        connections: 0,
        messagesSent: 0,
        errors: 0,
      };
      this.queueMetrics.set(queueId, metrics);
    }
    return metrics;
  }

  private getQueueMetrics(): any[] {
    return Array.from(this.queueMetrics.entries()).map(
      ([queueId, metrics]) => ({
        queueId,
        ...metrics,
      }),
    );
  }

  private getErrorMetrics(): ErrorMetric[] {
    return Array.from(this.errorMetrics.values());
  }

  private extractQueueFromOperation(operation: string): string | null {
    // Intentar extraer queueId de la operación si está disponible
    // Por ejemplo: "sse_send_queue_123" -> "123"
    const match = operation.match(/queue_([a-f0-9\-]+)/);
    return match ? match[1] : null;
  }

  // Métodos adicionales para limpieza
  resetMetrics(): void {
    this.queueMetrics.clear();
    this.errorMetrics.clear();
    this.startTime = new Date();
  }

  getQueueMetric(queueId: string): QueueMetrics | undefined {
    return this.queueMetrics.get(queueId);
  }
}
