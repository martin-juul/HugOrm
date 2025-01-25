import { Adapter } from './Adapter.js';
import { DBSchema, IDBPDatabase, IDBPTransaction, openDB, StoreNames, TypedDOMStringList } from 'idb';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ColumnDefinition, IndexDefinition } from '@martinjuul/hugorm/migrations/Schema';

interface HugOrmSchema extends DBSchema {
  [key: string]: {
    key: number;
    value: any;
  };
}

type TableName = StoreNames<HugOrmSchema>;

export class IndexedDbAdapter implements Adapter {
  inTransaction = false;
  private currentTransaction: IDBPTransaction<HugOrmSchema, TypedDOMStringList<StoreNames<HugOrmSchema>>, 'readwrite'> | null = null;
  private db: IDBPDatabase<HugOrmSchema> | null = null;
  private logger: ILogger = new ConsoleLogger();
  private isInitializing = false;

  constructor(
    private readonly dbName: string = 'hug-orm-db',
    private dbVersion: number = 1,
  ) {
    this.dbName = dbName;
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) throw new Error('Transaction already started');
    await this.ensureDb();

    this.currentTransaction = this.db!.transaction(
      this.db!.objectStoreNames as any,
      'readwrite',
    );
    this.inTransaction = true;
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) throw new Error('No active transaction');
    this.currentTransaction?.commit();
    this.currentTransaction = null;
    this.inTransaction = false;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) throw new Error('No active transaction');
    this.currentTransaction?.abort();
    this.currentTransaction = null;
    this.inTransaction = false;
  }

  async hasTable(table: string): Promise<boolean> {
    if (!this.db) {
      await this.ensureTable(table);
    }
    return this.db!.objectStoreNames.contains(table as TableName);
  }

  async createTable(table: string): Promise<void> {
    // Increment version to trigger schema update
    this.dbVersion++;
    this.db = await openDB<HugOrmSchema>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion, newVersion) {
        if (!db.objectStoreNames.contains(table as TableName)) {
          db.createObjectStore(table as TableName, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }

  async find<T extends {}>(table: string, id: number): Promise<T | null> {
    await this.ensureTable(table);
    return (await this.db!.get(table as TableName, id)) || null;
  }

  async create<T extends {}>(table: string, data: Partial<T>): Promise<T> {
    try {
      await this.ensureTable(table);
      const store = this.getStore(table);
      const { id, ...rest } = data as { id?: number; [key: string]: unknown };
      const recordId = store.add(rest);
      return { ...rest, id: recordId } as unknown as T;
    } catch (error) {
      if (this.inTransaction) await this.rollback();
      throw createError(`IndexedDB create failed for table ${table}`, error);
    }
  }

  async update<T extends { id?: number }>(table: string, id: number, data: Partial<T>): Promise<T> {
    try {
      await this.ensureTable(table);
      const store = this.getStore(table);
      const record = store.get(id);
      if (!record) {
        throw new Error('Record not found');
      }
      const updated = { ...record, ...data, id };
      await store.put(updated);
      return updated as T;
    } catch (error) {
      throw createError(`IndexedDB update failed for table ${table}`, error);
    }
  }

  async delete(table: string, id: number): Promise<boolean> {
    await this.ensureTable(table);
    const store = this.getStore(table);
    await store.delete(id);
    return true;
  }

  async all<T extends {}>(table: string): Promise<T[]> {
    await this.ensureTable(table);
    const store = this.getStore(table);

    return store.getAll();
  }

  async where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]> {
    const allRecords = await this.all<T>(table);
    return allRecords.filter(record => {
      return Object.keys(conditions).every(
        (key) => record[key as keyof T] === conditions[key as keyof T],
      );
    });
  }

  async query<T extends {}>(table: string, callback: (record: T) => boolean): Promise<T[]> {
    const allRecords = await this.all<T>(table);
    return allRecords.filter(callback);
  }

  async addColumn(table: string, column: ColumnDefinition): Promise<void> {
    // IndexedDB doesn't support columns, create index instead

  }

  async dropColumn(table: string, columnName: string): Promise<void> {
    // not implemented
  }

  async addIndex(table: string, options: IndexDefinition): Promise<void> {
    await this.ensureTable(table);
    const store = this.getStore(table, 'versionchange');
    if (store.createIndex) {
      store.createIndex(options.name, options.columns, {
        unique: options.unique,
        multiEntry: options.multiEntry,
        locale: options.locale,
      });
    } else {
      throw new Error('IndexedDB does not support indexes');
    }
  }

  async dropIndex(table: string, indexName: string): Promise<void> {
    await this.ensureTable(table);
    const store = this.getStore(table, 'versionchange');
    store.deleteIndex(indexName);
  }

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      this.db = await openDB<HugOrmSchema>(this.dbName, this.dbVersion, {
        upgrade: (db) => {
          // Empty upgrade handler - tables are created in ensureTable
        },
      });
    }
  }

  private getStore(table: string, transactionType: IDBTransactionMode = 'readwrite') {
    if (this.inTransaction && this.currentTransaction) {
      return this.currentTransaction.objectStore(table as TableName);
    }

    const tx = this.db!.transaction(table as TableName, transactionType);
    return tx.objectStore(table as TableName);
  }

  private async ensureTable(table: string): Promise<void> {
    await this.ensureDb();
    if (!this.db!.objectStoreNames.contains(table as TableName)) {
      this.dbVersion++;
      this.db = await openDB<HugOrmSchema>(this.dbName, this.dbVersion, {
        upgrade: (db, oldVersion, newVersion) => {
          if (!db.objectStoreNames.contains(table as TableName)) {
            db.createObjectStore(table as TableName, {
              keyPath: 'id',
              autoIncrement: true,
            });
          }
        },
      });
    }
  }

  private async initializeDatabase(table: string): Promise<IDBPDatabase<HugOrmSchema>> {
    return openDB<HugOrmSchema>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion, newVersion) {
        if (!db.objectStoreNames.contains(table as TableName)) {
          db.createObjectStore(table as TableName, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
}
