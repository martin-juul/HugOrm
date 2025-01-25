import { Model } from '@martinjuul/hugorm/models/Model';

export class Migration extends Model {
  static table = 'migrations';
  tableName!: string;
  version!: number;
  migrationScript!: string;
}
