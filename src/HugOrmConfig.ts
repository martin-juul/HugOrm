import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';

export interface HugOrmConfig {
  adapter: Adapter;
  autoMigrate: boolean;
  migrationTable?: string;
  logger?: ILogger;
}
