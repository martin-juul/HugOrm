import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ColumnDefinition, IndexDefinition } from '@martinjuul/hugorm/migrations/Schema';

export interface Adapter {
  inTransaction: boolean;

  hasTable(table: string): Promise<boolean>;

  createTable(table: string): Promise<void>;

  find<T extends {}>(table: string, id: number): Promise<T | null>;

  create<T extends {}>(table: string, data: Partial<T>): Promise<T>;

  update<T extends {}>(table: string, id: number, data: Partial<T>): Promise<T>;

  delete(table: string, id: number): Promise<boolean>;

  all<T extends {}>(table: string): Promise<T[]>;

  where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]>;

  query<T extends {}>(table: string, callback: (record: T) => boolean): Promise<T[]>;

  beginTransaction(): Promise<void>;

  commit(): Promise<void>;

  rollback(): Promise<void>;

  createTable(table: string, columns: ColumnDefinition[]): Promise<void>;

  dropTable(table: string): Promise<void>;

  addColumn(table: string, column: ColumnDefinition): Promise<void>;

  dropColumn(table: string, columnName: string): Promise<void>;

  addIndex(table: string, options: IndexDefinition): Promise<void>;

  dropIndex(table: string, name: string): Promise<void>;

  setLogger(logger: ILogger): void;
}
