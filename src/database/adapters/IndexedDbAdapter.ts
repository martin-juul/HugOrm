import type {
  DBSchema,
  IDBPDatabase,
  IDBPObjectStore,
  IDBPTransaction,
  IndexNames,
  StoreNames,
  TypedDOMStringList,
} from 'idb';
import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ColumnDefinition, IndexDefinition } from '@martinjuul/hugorm/migrations/Schema';

interface HugOrmSchema extends DBSchema {
  [key: string]: {
    key: number;
    value: any;
  };
}

type TableName = StoreNames<HugOrmSchema>;
type HugIndex = IndexNames<HugOrmSchema, never>;
type IdbObjectStore = IDBPObjectStore<HugOrmSchema, TypedDOMStringList<StoreNames<HugOrmSchema>>, never, IDBTransactionMode>;

type IdbTransaction<Mode extends IDBTransactionMode> = IDBPTransaction<
  HugOrmSchema,
  TypedDOMStringList<StoreNames<HugOrmSchema>>,
  Mode
>;
type IdbTransactionRW = IdbTransaction<'readwrite'>;
type IdbTransactionRO = IdbTransaction<'readonly'>;
type IdbTransactionVersion = IdbTransaction<'versionchange'>;


export class IndexedDbAdapter implements Adapter {
  private transaction: IdbTransaction<any> | null = null;
  private mode: IDBTransactionMode = 'readwrite';
  private _db: IDBPDatabase<HugOrmSchema> | null = null;
  private logger: ILogger = new ConsoleLogger();
  private isTransactionActive: boolean = false;
  private idb: typeof import('idb') | null = null;
  private ready = false;

  constructor(
    private readonly dbName: string = 'hug-orm-db',
    private dbVersion: number = 1,
  ) {
    this.initialize();
  }

  get inTransaction(): boolean {
    return this.isTransactionActive;
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  initialize() {
    import('idb').then(idb => {
      this.idb = idb;
      this.ready = true;
    });
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already started');
    }

    const db = await this.getDb();
    this.mode = 'readwrite';
    this.transaction = db.transaction(db.objectStoreNames, this.mode);
    this.isTransactionActive = true;
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    this.transaction?.commit();
    this.resetTransaction();
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    this.transaction?.abort();
    this.resetTransaction();
  }

  async find<T>(table: string, id: number): Promise<T | null> {
    const store = await this.getStore(table, 'readonly');
    return store.get(id) as Promise<T | null>;
  }

  async create<T>(table: string, data: Partial<T>): Promise<T> {
    try {
      const store = await this.getStore(table);
      const { id, ...rest } = data as { id?: number; [key: string]: unknown };
      // @ts-expect-error
      const recordId = await store.add(rest);
      return { ...rest, id: recordId } as T;
    } catch (error) {
      await this.handleTransactionError(error, `IndexedDB create failed for table ${table}`);
    }

    throw new Error(`IndexedDB create failed for table ${table}`);
  }

  async update<T extends { id?: number }>(table: string, id: number, data: Partial<T>): Promise<T> {
    try {
      const store = await this.getStore(table);
      const existing = await store.get(id);

      if (!existing) {
        throw new Error('Record not found');
      }

      const updated = { ...existing, ...data, id };
      // @ts-expect-error
      await store.put(updated);
      return updated as T;
    } catch (error) {
      throw createError(`IndexedDB update failed for table ${table}`, error);
    }
  }

  async delete(table: string, id: number): Promise<boolean> {
    const store = await this.getStore(table, 'readwrite');
    // @ts-expect-error
    await store.delete(id);
    return true;
  }

  async all<T>(table: string): Promise<T[]> {
    const store = await this.getStore(table, 'readonly');
    return store.getAll() as Promise<T[]>;
  }

  async where<T>(table: string, conditions: Partial<T>): Promise<T[]> {
    const records = await this.all<T>(table);
    return records.filter(record =>
      Object.keys(conditions).every(key => record[key as keyof T] === conditions[key as keyof T]),
    );
  }

  async query<T>(table: string, callback: (record: T) => boolean): Promise<T[]> {
    const records = await this.all<T>(table);
    return records.filter(callback);
  }

  async addColumn(table: string, column: ColumnDefinition): Promise<void> {
    this.logger.debug('IndexedDB does not support adding columns.', { table, column });
  }

  async dropColumn(table: string, columnName: string): Promise<void> {
    this.logger.debug('IndexedDB does not support dropping columns.', { table, columnName });
  }

  async addIndex(table: string, options: IndexDefinition): Promise<void> {
    const tx = this.createTransaction(table, 'versionchange');
    const store = (await tx).objectStore(table as TableName);

    if (!store.indexNames.contains(options.name as HugIndex)) {
      if (typeof store.createIndex !== 'function') {
        throw new Error('IndexedDB does not support indexes.');
      }

      store.createIndex(options.name as HugIndex, options.columns, {
        unique: options.unique,
        multiEntry: options.multiEntry,
      });
    }
  }

  async dropIndex(table: string, name: string): Promise<void> {
    await this.upgradeDb((db) => {
      const tx = db.transaction(table as TableName);
      const store = tx.objectStore(table as TableName);

      if (store.indexNames.contains(name as IndexNames<HugOrmSchema, never>)) {
        store.deleteIndex(name);
      }
    });
  }

  async dropTable(table: string): Promise<void> {
    try {
      await this.upgradeDb((db) => {
        if (db.objectStoreNames.contains(table as TableName)) {
          db.deleteObjectStore(table as TableName);
        }
      });
    } catch (error) {
      this.logger.error('Failed to drop table', { table });
    }
  }

  async hasTable(table: string): Promise<boolean> {
    const db = await this.getDb();
    return db.objectStoreNames.contains(table as TableName);
  }

  async createTable(table: string): Promise<void> {
    await this.upgradeDb((db) => {
      if (!db.objectStoreNames.contains(table as TableName)) {
        db.createObjectStore(table as TableName, { keyPath: 'id', autoIncrement: true });
      }
    });
  }

  private async getDb(): Promise<IDBPDatabase<HugOrmSchema>> {
    if (!this._db) {
      this._db = await this.idb!.openDB<HugOrmSchema>(this.dbName, this.dbVersion);
    }
    return this._db;
  }

  private async upgradeDb(upgradeCallback: (db: IDBPDatabase<HugOrmSchema>) => void): Promise<void> {
    this.dbVersion++;
    this._db = await this.idb!.openDB<HugOrmSchema>(this.dbName, this.dbVersion, {
      upgrade: (db) => upgradeCallback(db),
    });
  }

  private async createTransaction<T extends IDBTransactionMode>(
    table: string,
    mode: T,
  ): Promise<IdbTransaction<T>> {
    if (this.inTransaction) {
      throw new Error('Transaction already started');
    }

    const db = await this.getDb();

    return db.transaction(table as TableName, mode) as IdbTransaction<T>;
  }

  private async getStore(
    table: string,
    mode: IDBTransactionMode = 'readwrite',
  ): Promise<IdbObjectStore> {
    const db = await this.getDb();

    if (this.transaction) {
      if (this.transaction.mode !== mode) {
        this.logger.error('Called getStore while already in a transaction with a different mode.', {
          currentMode: this.transaction.mode,
          requestedMode: mode,
        });

        throw new Error('Transaction mode does not match');
      }

      return this.transaction.objectStore(table as TableName);
    }

    this.mode = mode;

    const tx = db.transaction(table as TableName, mode);
    return tx.objectStore(table as TableName);
  }

  private resetTransaction(): void {
    this.transaction = null;
    this.isTransactionActive = false;
  }

  private async handleTransactionError(error: unknown, message: string): Promise<void> {
    if (this.inTransaction) {
      await this.rollback();
    }
    throw createError(message, error);
  }
}
