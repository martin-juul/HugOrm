import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { MigrationScript } from '@martinjuul/hugorm/models/MigrationScript';

export interface HugOrmConfig {
  adapter: Adapter;
  autoMigrate: boolean;
  migrations: MigrationScript[];
  migrationTable?: string;
  logger?: ILogger;
}
