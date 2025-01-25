import { Schema } from '@martinjuul/hugorm/migrations/Schema';

export const CreateMigrationsTable = Schema.create(0, 'migrations', table => {
  table.id();
  table.integer('version');
  table.string('name');
  table.date('appliedAt');
  table.string('checksum');
  table.string('script');
});
