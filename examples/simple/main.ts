import { Model } from '../../src/models/Model';
import { hugmodel } from '../../src/decorators/hugmodel';
import { HugOrm } from '../../src/HugOrm';
import { InMemoryAdapter } from '../../src/database/adapters/InMemoryAdapter';
import { MigrationScript } from '../../src/models/MigrationScript';

const createUserTable: MigrationScript = {
  name: 'create_users',
  table: 'users',
  version: 1,
  up(): Promise<void> {

  },
};

@hugmodel()
class User extends Model {
}

const hugOrm = new HugOrm({
  adapter: new InMemoryAdapter(),
  autoMigrate: true,
  migrations: [],
});


(async () => {
  await hugOrm.setupDatabase();
  await hugOrm.setupMigrationManager();
  await hugOrm.bootstrap();
})();
