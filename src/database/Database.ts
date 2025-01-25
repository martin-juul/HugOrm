import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';

export class Database {
  private logger: ILogger;

  constructor(
    private adapter: Adapter,
    logger?: ILogger,
  ) {
    this.logger = logger || new ConsoleLogger();
  }

  get adapterInstance() {
    return this.adapter;
  }

  async hasTable(table: string): Promise<boolean> {
    return this.adapter.hasTable(table);
  }

  async createTable(table: string): Promise<void> {
    try {
      if (!(await this.adapter.hasTable(table))) {
        await this.adapter.createTable(table);
      }
    } catch (error) {
      throw createError(`Failed to create table ${table}`, error);
    }
  }

  async ensureTable(table: string): Promise<void> {
    await this.createTable(table);
  }

  async find<T extends {}>(table: string, id: number): Promise<T | null> {
    try {
      return await this.adapter.find<T>(table, id);
    } catch (error) {
      throw createError(`Failed to find record in table ${table}`, error);
    }
  }

  async create<T extends {}>(table: string, data: Partial<T>): Promise<T> {
    try {
      return await this.adapter.create<T>(table, data);
    } catch (error) {
      throw createError(`Failed to create record in table ${table}`, error);
    }
  }

  async update<T extends {}>(table: string, id: number, data: Partial<T>): Promise<T> {
    try {
      return await this.adapter.update<T>(table, id, data);
    } catch (error) {
      throw createError(`Failed to update record in table ${table}`, error);
    }
  }

  async all<T extends {}>(table: string): Promise<T[]> {
    try {
      return await this.adapter.all<T>(table);
    } catch (error) {
      throw createError(`Failed to fetch all records from table ${table}`, error);
    }
  }

  async where<T extends {}>(table: string, conditions: Partial<T>): Promise<T[]> {
    try {
      return await this.adapter.where<T>(table, conditions);
    } catch (error) {
      throw createError(`Failed to fetch records from table ${table} with conditions`, error);
    }
  }

  async query<T extends {}>(table: string, callback: (record: T) => boolean): Promise<T[]> {
    try {
      return await this.adapter.query<T>(table, callback);
    } catch (error) {
      throw createError(`Failed to query records from table ${table}`, error);
    }
  }

  async delete(table: string, id: number): Promise<boolean> {
    try {
      return await this.adapter.delete(table, id);
    } catch (error) {
      throw createError(`Failed to delete record in table ${table}`, error);
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (this.adapter.inTransaction) {
      throw new Error('Transaction already in progress');
    }

    try {
      await this.adapter.beginTransaction();
      const result = await callback();
      await this.adapter.commit();
      return result;
    } catch (error) {
      await this.adapter.rollback();
      throw createError('Transaction failed', error);
    }
  }
}
