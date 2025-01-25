import { HugOrmConfig } from '@martinjuul/hugorm/HugOrmConfig';

export const resolveMigrationTableName = (config: HugOrmConfig) => {
  return config.migrationTable || 'migrations';
};
