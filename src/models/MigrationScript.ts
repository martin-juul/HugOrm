import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';

export interface MigrationScript {
  version: number;
  name: string;
  table: string;

  up(db: Adapter): Promise<void>;

  down(db: Adapter): Promise<void>;
}
