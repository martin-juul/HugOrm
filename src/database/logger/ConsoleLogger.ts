import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';

export class ConsoleLogger implements ILogger {
  debug(message: string, context?: object): void {
    console.debug(`[DEBUG] ${message}`, context);
  }

  info(message: string, context?: object): void {
    console.info(`[INFO] ${message}`, context);
  }

  warn(message: string, context?: object): void {
    console.warn(`[WARN] ${message}`, context);
  }

  error(message: string, context?: object): void {
    console.error(`[ERROR] ${message}`, context);
  }
}
