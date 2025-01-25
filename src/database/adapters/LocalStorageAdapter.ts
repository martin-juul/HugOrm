import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ColumnDefinition, IndexDefinition } from '@martinjuul/hugorm/migrations/Schema';

export class LocalStorageAdapter implements Adapter {
  inTransaction = false;
  private transactionData: Record<string, any> | null = null;
  private logger: ILogger = new ConsoleLogger();

  constructor(
    private readonly dbName: string = 'hugorm-db',
    private readonly dbVersion: number = 1,
  ) {
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already started');
    }
    this.transactionData = this.getData();
    this.inTransaction = true;
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }
    this.setData(this.transactionData!);
    this.transactionData = null;
    this.inTransaction = false;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }
    this.transactionData = null;
    this.inTransaction = false;
  }

  async hasTable(table: string): Promise<boolean> {
    const data = this.getData();
    return data[table] !== undefined;
  }

  async createTable(table: string): Promise<void> {
    try {
      const data = this.getData();
      if (!data[table]) {
        data[table] = [];
        this.setData(data);
      }
    } catch (error) {
      throw createError(`LocalStorage createTable failed for ${table}`, error);
    }
  }

  async dropTable(table: string): Promise<void> {
    const data = this.getData();
    if (data.hasOwnProperty(table)) {
      delete data[table];
      this.setData(data);
    }
  }

  async addColumn(table: string, column: ColumnDefinition): Promise<void> {
    this.logger.debug('LocalStorage does not support adding columns.', { table, column });
  }

  async dropColumn(table: string, columnName: string): Promise<void> {
    this.logger.debug('LocalStorage does not support dropping columns.', { table, columnName });
  }

  async addIndex(table: string, options: IndexDefinition): Promise<void> {
    this.logger.debug('LocalStorage does not support indexes.', { table, options });
  }

  async dropIndex(table: string, name: string): Promise<void> {
    this.logger.debug('LocalStorage does not support indexes.', { table, name });
  }

  async find<T extends {}>(table: string, id: number): Promise<T | null> {
    const data = this.getData();
    const records = data[table];
    if (!records) {
      throw new Error(`Table ${table} does not exist`);
    }
    return records.find((record: { id: number; }) => record.id === id) || null;
  }

  async create<T extends { id?: number }>(table: string, data: Partial<T>): Promise<T> {
    try {
      const storedData = this.getData();
      if (!storedData[table]) {
        storedData[table] = [];
      }
      const record = { ...data, id: storedData[table].length + 1 };
      storedData[table].push(record);
      this.setData(storedData);
      return record as T;
    } catch (error) {
      throw createError(`LocalStorage create failed for table ${table}`, error);
    }
  }

  async update<T extends {}>(table: string, id: number, data: Partial<T>): Promise<T> {
    const storedData = this.getData();
    const records = storedData[table];
    if (!records) {
      throw new Error(`Table ${table} does not exist`);
    }
    const record = records.find((record: { id: number; }) => record.id === id);
    if (!record) {
      throw new Error(`Record with id ${id} not found in table ${table}`);
    }
    Object.assign(record, data);
    this.setData(storedData);
    return record;
  }

  async delete(table: string, id: number): Promise<boolean> {
    const storedData = this.getData();
    const records = storedData[table];
    if (!records) {
      throw new Error(`Table ${table} does not exist`);
    }
    storedData[table] = records.filter((record: { id: number; }) => record.id !== id);
    this.setData(storedData);
    return true;
  }

  async all<T extends {}>(table: string): Promise<T[]> {
    const storedData = this.getData();
    return storedData[table] || [];
  }

  async where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]> {
    const records = this.getData()[table] || [];
    return records.filter((record: Partial<T>) => {
      return (Object.keys(conditions) as Array<keyof T>).every(
        (key) => record[key] === conditions[key],
      );
    });
  }

  async query<T extends {}>(table: string, callback: (record: T) => boolean): Promise<T[]> {
    const records = this.getData()[table] || [];
    return records.filter(callback);
  }

  private getData(): Record<string, any> {
    return this.inTransaction
           ? JSON.parse(JSON.stringify(this.transactionData))
           : JSON.parse(localStorage.getItem(this.dbName) || '{}');
  }

  private setData(data: Record<string, any>): void {
    if (this.inTransaction) {
      this.transactionData = data;
    } else {
      localStorage.setItem(this.dbName, JSON.stringify(data));
    }
  }
}
