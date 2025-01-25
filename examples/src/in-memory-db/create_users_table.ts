import { Schema } from '@martinjuul/hugorm';

export const users = Schema.create(1, 'users', table => {
  table.id();
  table.string('name');
  table.string('email');
});
