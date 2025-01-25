import { HugOrm, InMemoryAdapter, Schema } from '@martinjuul/hugorm';
import { Profile, User } from './model';


export async function setup() {

  const hugOrm = new HugOrm({
    adapter: new InMemoryAdapter(),
    autoMigrate: true,
  });

  const createUserTable = Schema.create(1, 'users', (table) => {
    table.id();
    table.string('name');
    table.string('email');
    table.integer('profileId');
  });

  const createProfileTable = Schema.create(2, 'profiles', (table) => {
    table.id();
    table.string('bio');
    table.integer('userId');
  });

  const migrations = [
    createUserTable,
    createProfileTable,
  ];

  hugOrm.registerMigrations(migrations);
  hugOrm.registerModel(User);
  hugOrm.registerModel(Profile);

  return hugOrm;
}
