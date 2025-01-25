import { Schema } from '../../src/migrations/Schema';

export const users = Schema.create('users', table => {
  table.id();
  table.string('name');
  table.string('email');
});
