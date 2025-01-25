import type { Adapter } from './Adapter.js';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';

export class InMemoryAdapter implements Adapter {
  inTransaction = false;
  private data: Record<string, any[]> = {};
  private transactionSnapshot: Record<string, any[]> | null = null;
  private logger: ILogger = new ConsoleLogger();

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  // Transaction methods
  async beginTransaction(): Promise<void> {
    if (this.inTransaction) throw new Error('Transaction already started');
    this.transactionSnapshot = JSON.parse(JSON.stringify(this.data));
    this.inTransaction = true;
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) throw new Error('No active transaction');
    this.data = this.transactionSnapshot!;
    this.transactionSnapshot = null;
    this.inTransaction = false;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) throw new Error('No active transaction');
    this.transactionSnapshot = null;
    this.inTransaction = false;
  }

  async hasTable(table: string): Promise<boolean> {
    return this.data[table] !== undefined;
  }

  async createTable(table: string): Promise<void> {
    if (!this.data[table]) {
      this.data[table] = [];
    }
  }

  async find<T extends {}>(table: string, id: number): Promise<T | null> {
    const records = this.data[table];
    if (!records) throw new Error(`Table ${table} does not exist`);
    return records.find(record => record.id === id) || null;
  }

  async create<T extends {}>(table: string, data: Partial<T>): Promise<T> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    if (!target[table]) target[table] = [];
    const record = { ...data, id: target[table].length + 1 };
    target[table].push(record);
    return record as T;
  }

  async update<T extends {}>(table: string, id: number, data: Partial<T>): Promise<T> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    const index = records.findIndex(record => record.id === id);

    if (index === -1) throw new Error('Record not found');
    const updated = { ...records[index], ...data };
    target[table][index] = updated;
    return updated as T;
  }

  async delete(table: string, id: number): Promise<boolean> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    const initialLength = records.length;
    target[table] = records.filter(record => record.id !== id);
    return records.length !== initialLength;
  }

  async all<T extends {}>(table: string): Promise<T[]> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    return (target[table] || []).slice() as T[];
  }

  async where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    return records.filter(record => {
      return Object.keys(conditions).every(
        (key) => record[key as keyof T] === conditions[key as keyof T],
      );
    });
  }

  async query<T extends {}>(table: string, callback: (record: T) => boolean): Promise<T[]> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    return records.filter(callback);
  }
}
