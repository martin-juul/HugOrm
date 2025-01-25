import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';

export class ConsoleLogger implements ILogger {
  debug(message: string, context?: object): void {
    console.debug(message, context);
  }

  info(message: string, context?: object): void {
    console.info(message, context);
  }

  warn(message: string, context?: object): void {
    console.warn(message, context);
  }

  error(message: string, context?: object): void {
    console.error(message, context);
  }
}
