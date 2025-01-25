import 'reflect-metadata';
import { setup } from './setup';
import { User } from './model';


async function main() {
  const hugOrm = await setup();

  User.create({
    name: 'Martin',
    email: '<EMAIL>',
  });
}


main().then();
