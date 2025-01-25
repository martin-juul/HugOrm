import type { Adapter } from './Adapter.js';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';
import { ColumnDefinition, IndexDefinition } from '@martinjuul/hugorm/migrations/Schema';

export class InMemoryAdapter implements Adapter {
  inTransaction = false;
  private data: Record<string, any[]> = {};
  private transactionSnapshot: Record<string, any[]> | null = null;
  private logger: ILogger = new ConsoleLogger();

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  // Transaction Methods
  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already started');
    }
    // Clone the current data state for the transaction
    this.transactionSnapshot = JSON.parse(JSON.stringify(this.data));
    this.inTransaction = true;
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }
    // Apply transaction changes to main data
    this.data = this.transactionSnapshot!;
    this.transactionSnapshot = null;
    this.inTransaction = false;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }
    // Discard transaction changes
    this.transactionSnapshot = null;
    this.inTransaction = false;
  }

  // Table Operations
  async hasTable(table: string): Promise<boolean> {
    return this.data[table] !== undefined;
  }

  async createTable(table: string): Promise<void> {
    if (!this.data[table]) {
      this.data[table] = [];
    }
  }

  async dropTable(table: string): Promise<void> {
    if (this.data[table]) {
      delete this.data[table];
    }
  }

  // Schema Modifications (Not Supported)
  async addColumn(table: string, column: ColumnDefinition): Promise<void> {
    this.logger.debug('In-memory adapter does not support adding columns.', { table, column });
  }

  async dropColumn(table: string, columnName: string): Promise<void> {
    this.logger.debug('In-memory adapter does not support dropping columns.', { table, columnName });
  }

  async addIndex(table: string, options: IndexDefinition): Promise<void> {
    this.logger.debug('In-memory adapter does not support indexes.', { table, options });
  }

  async dropIndex(table: string, name: string): Promise<void> {
    this.logger.debug('In-memory adapter does not support indexes.', { table, name });
  }

  // CRUD Operations
  async find<T extends {}>(table: string, id: number): Promise<T | null> {
    const records = this.data[table];
    if (!records) {
      throw new Error(`Table ${table} does not exist`);
    }
    return records.find((record) => record.id === id) || null;
  }

  async create<T extends {}>(table: string, data: Partial<T>): Promise<T> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    if (!target[table]) {
      target[table] = [];
    }
    const record = { ...data, id: target[table].length + 1 };
    target[table].push(record);
    return record as unknown as T;
  }

  async update<T extends {}>(table: string, id: number, data: Partial<T>): Promise<T> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    const index = records.findIndex((record) => record.id === id);

    if (index === -1) {
      throw new Error('Record not found');
    }
    const updated = { ...records[index], ...data };
    target[table][index] = updated;
    return updated as T;
  }

  async delete(table: string, id: number): Promise<boolean> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    const initialLength = records.length;
    target[table] = records.filter((record) => record.id !== id);
    return records.length !== initialLength;
  }

  // Query Methods
  async all<T extends {}>(table: string): Promise<T[]> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    return (target[table] || []).slice() as T[]; // Return a copy to prevent mutation
  }

  async where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]> {
    const target = this.inTransaction ? this.transactionSnapshot! : this.data;
    const records = target[table] || [];
    return records.filter((record) => {
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
