import { Adapter } from '@martinjuul/hugorm/database/adapters/Adapter';

export type ColumnType =
  | 'increments'
  | 'string'
  | 'text'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'json';

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  primary?: boolean;
  default?: any;
  length?: number;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  multiEntry?: boolean;
  locale?: string | null;
}

export class Blueprint {
  columns: ColumnDefinition[] = [];
  indices: IndexDefinition[] = [];
  dropIndices: { table: string; name: string }[] = [];

  id(name = 'id'): this {
    this.columns.push({
      name,
      type: 'increments',
      primary: true,
    });
    return this;
  }

  string(name: string, length = 255): this {
    this.columns.push({
      name,
      type: 'string',
      length,
    });
    return this;
  }

  integer(name: string): this {
    this.columns.push({
      name,
      type: 'integer',
    });
    return this;
  }

  index(options: IndexDefinition): this {
    this.indices.push(options);

    return this;
  }

  dropIndex(options: { table: string; name: string }): this {
    this.dropIndices.push(options);
    return this;
  }
}

export class Schema {
  static create(table: string, callback: (table: Blueprint) => void) {
    const blueprint = new Blueprint();
    callback(blueprint);

    return {
      version: Date.now(),
      name: `create_${table}_table`,
      async up(adapter: Adapter) {
        await adapter.createTable(table, blueprint.columns);

        for (const column of blueprint.columns) {
          await adapter.addColumn(table, column);
        }

        for (const index of blueprint.indices) {
          await adapter.addIndex(table, index);
        }
      },
      async down(adapter: Adapter) {
        await adapter.dropTable(table);

        for (const index of blueprint.dropIndices.reverse()) {
          await adapter.dropIndex(table, index.name);
        }

        for (const column of blueprint.columns.reverse()) {
          await adapter.dropColumn(table, column.name);
        }
      },
    };
  }


  static table(table: string, callback: (table: Blueprint) => void) {
    const blueprint = new Blueprint();
    callback(blueprint);

    return {
      version: Date.now(),
      name: `alter_${table}_table`,
      async up(adapter: Adapter) {
        for (const column of blueprint.columns) {
          await adapter.addColumn(table, column);
        }

        for (const index of blueprint.indices) {
          await adapter.addIndex(table, index);
        }
      },
      async down(adapter: Adapter) {
        for (const index of blueprint.dropIndices.reverse()) {
          await adapter.dropIndex(table, index.name);
        }

        for (const column of blueprint.columns.reverse()) {
          await adapter.dropColumn(table, column.name);
        }
      },
    };
  }
}
