import type { Adapter } from './Adapter.js';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';

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

  async hasTable(table: string): Promise<boolean> {
    const data = this.getData();
    return data[table] !== undefined;
  }

  async find<T extends {}>(table: string, id: number): Promise<T | null> {
    const data = this.getData();
    const records = data[table];
    if (!records) {
      throw new Error(`Table ${table} does not exist`);
    }
    return records.find(record => record.id === id) || null;
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
    const record = records.find(record => record.id === id);
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
    storedData[table] = records.filter(record => record.id !== id);
    this.setData(storedData);
    return true;
  }

  async all<T extends {}>(table: string): Promise<T[]> {
    const storedData = this.getData();
    return storedData[table] || [];
  }

  async where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]> {
    const records = this.getData()[table] || [];
    return records.filter(record => {
      return Object.keys(conditions).every(
        (key) => record[key as keyof T] === conditions[key as keyof T],
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
    const target = this.inTransaction ? this.transactionData : localStorage;
    if (this.inTransaction) {
      this.transactionData = data;
    } else {
      localStorage.setItem(this.dbName, JSON.stringify(data));
    }
  }
}
