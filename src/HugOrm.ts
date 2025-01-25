import { Database } from '@martinjuul/hugorm/database/Database';
import { MigrationManager } from '@martinjuul/hugorm/services/MigrationManager';
import { HugOrmConfig } from '@martinjuul/hugorm/HugOrmConfig';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ModelContainer } from '@martinjuul/hugorm/container/ModelContainer';
import { Model } from '@martinjuul/hugorm/models/Model';
import { resolveMigrationTableName } from '@martinjuul/hugorm/utils/resolveMigrationTableName';
import { CreateMigrationsTable } from '@martinjuul/hugorm/database/migrations/CreateMigrationsTable';
import { MigrationScript } from '@martinjuul/hugorm/models/MigrationScript';

export class HugOrm {
  private db: Database | null = null;
  private migrationManager: MigrationManager | null = null;
  private static config: HugOrmConfig;

  constructor(private config: HugOrmConfig) {
    ModelContainer.registerMigration(CreateMigrationsTable);
    HugOrm.config = config;
  }

  registerMigration(script: MigrationScript): void {
    ModelContainer.registerMigration(script);
  }

  registerMigrations(scripts: MigrationScript[]): void {
    for (const script of scripts) {
      this.registerMigration(script);
    }
  }

  async setupDatabase(): Promise<void> {
    if (this.db) {
      return;
    }

    this.db = new Database(this.config.adapter);

    try {
      await this.db.all(resolveMigrationTableName(this.config));
    } catch (error) {
      throw createError('Database adapter check failed', error);
    }
  }

  async setupMigrationManager(): Promise<void> {
    if (this.migrationManager) {
      return;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.migrationManager = new MigrationManager(this.db, resolveMigrationTableName(this.config));
  }

  async bootstrap(): Promise<void> {
    await this.setupDatabase();
    await this.setupMigrationManager();

    if (this.config.autoMigrate) {
      await this.applyMigrations();
    }

    ModelContainer.getModelClasses().forEach(modelClass => {
      modelClass.setDatabase(this.getDatabase());
    })
  }

  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Add models to ModelContainer directly
  registerModel(modelClass: typeof Model): void {
    ModelContainer.registerClass(modelClass);
  }

  async applyMigrations(): Promise<void> {
    if (!this.migrationManager) {
      return;
    }

    await this.migrationManager.migrate();
  }
}
