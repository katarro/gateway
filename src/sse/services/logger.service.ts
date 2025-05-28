import { Injectable, Logger } from '@nestjs/common';
import { ILogger } from '../interfaces';

@Injectable()
export class LoggerService implements ILogger {
  private readonly logger = new Logger('SSE');

  info(message: string, context?: any): void {
    if (context) {
      this.logger.log(`${message} ${JSON.stringify(context)}`);
    } else {
      this.logger.log(message);
    }
  }

  error(message: string, error?: Error, context?: any): void {
    const errorInfo = error ? ` - ${error.message}` : '';
    const contextInfo = context ? ` ${JSON.stringify(context)}` : '';
    const stack = error?.stack;

    this.logger.error(`${message}${errorInfo}${contextInfo}`, stack);
  }

  warn(message: string, context?: any): void {
    if (context) {
      this.logger.warn(`${message} ${JSON.stringify(context)}`);
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string, context?: any): void {
    if (context) {
      this.logger.debug(`${message} ${JSON.stringify(context)}`);
    } else {
      this.logger.debug(message);
    }
  }
}
