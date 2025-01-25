import { Model } from '@martinjuul/hugorm/models/Model';
import { MigrationScript } from '@martinjuul/hugorm/models/MigrationScript';

export class ModelContainer {
  private static migrationRegistry = new Map<number, MigrationScript>();
  private static instanceRegistry = new Map<string, Model<any>[]>();

  private static _classRegistry = new Map<string, typeof Model>();

  static get classRegistry(): Map<string, typeof Model> {
    return this._classRegistry;
  }

  static register(instance: Model<any>): void {
    const modelName = instance.constructor.name;
    if (!this.instanceRegistry.has(modelName)) {
      this.instanceRegistry.set(modelName, []);
    }
    this.instanceRegistry.get(modelName)!.push(instance);
  }

  static registerClass(modelClass: typeof Model): void {
    const modelName = modelClass.name; // Get the class name here
    this._classRegistry.set(modelName, modelClass);
  }

  static getAllInstances<T extends Model<T>>(modelClass: new () => T): T[] {
    return (this.instanceRegistry.get(modelClass.name) || []) as T[];
  }

  static getModelClass<T extends typeof Model>(name: string): T | undefined {
    return this._classRegistry.get(name) as T;
  }

  static async syncAll(): Promise<void> {
    for (const [name, modelClass] of this._classRegistry) {
      if (!await modelClass.database.hasTable(modelClass.table)) {
        await modelClass.database.createTable(modelClass.table);
      }
    }
  }

  static registerMigration(script: MigrationScript): void {
    this.migrationRegistry.set(script.version, script);
  }

  static getMigrations(): MigrationScript[] {
    return Array.from(this.migrationRegistry.values())
                .sort((a, b) => a.version - b.version);
  }
}
