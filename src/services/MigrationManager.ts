import { Database } from '../database/Database';
import { MigrationScript } from '../models/MigrationScript';
import { ModelContainer } from '@martinjuul/hugorm/container/ModelContainer';

interface DBMigration {
  id?: number;
  version: number;
  name: string;
  appliedAt: Date;
  checksum: string;
  script: string;
}

export class MigrationManager {
  private currentVersion: number = 0;

  constructor(
    private db: Database,
    private readonly _migrationTableName: string,
  ) {
  }

  get migrationTableName(): string {
    return this._migrationTableName;
  }

  get migrations(): MigrationScript[] {
    return ModelContainer.getMigrations();
  }

  async bootstrap(): Promise<void> {
    await this.db.ensureTable(this.migrationTableName);
    await this.loadCurrentVersion();
  }

  async migrate(): Promise<void> {
    await this.bootstrap();

    const pending = this.migrations.filter(m => m.version > this.currentVersion);

    for (const migration of pending) {
      try {
        await this.db.transaction(async () => {
          await migration.up(this.db.adapterInstance);
          await this.recordMigration(migration);
        });
      } catch (error) {
        console.error(`Migration failed: ${migration.name}`, error);
        throw new Error(`Migration failed at version ${migration.version}`);
      }
    }
  }

  async rollback(version?: number): Promise<void> {
    await this.bootstrap();
    const targetVersion = version ?? Math.max(0, this.currentVersion - 1);
    const rollbacks = this.migrations
                          .filter(m => m.version > targetVersion && m.version <= this.currentVersion)
                          .reverse();

    for (const migration of rollbacks) {
      try {
        await this.db.transaction(async () => {
          await migration.down(this.db.adapterInstance);
          await this.removeMigration(migration);
        });
      } catch (error) {
        console.error(`Rollback failed: ${migration.constructor.name}`, error);
        throw new Error(`Rollback failed at version ${migration.version}`);
      }
    }
  }

  async validate(): Promise<boolean> {
    const appliedMigrations = await this.db.all<DBMigration>(this.migrationTableName);

    return appliedMigrations.every(applied => {
      const migration = this.migrations.find(m => m.version === applied.version);
      return migration && this.generateChecksum(migration) === applied.checksum;
    });
  }

  async status(): Promise<{
    currentVersion: number;
    pending: number;
    history: DBMigration[];
  }> {
    await this.bootstrap();
    return {
      currentVersion: this.currentVersion,
      pending: this.migrations.filter(m => m.version > this.currentVersion).length,
      history: await this.db.all<DBMigration>(this.migrationTableName),
    };
  }

  async applyMigration(migration: MigrationScript): Promise<void> {
    await migration.up(this.db.adapterInstance);
  }

  async revertMigration(migration: MigrationScript): Promise<void> {
    await migration.down(this.db.adapterInstance);
  }

  private async loadCurrentVersion(): Promise<void> {
    const results = await this.db.all<DBMigration>(this.migrationTableName);
    this.currentVersion = results.length > 0
                          ? Math.max(...results.map(m => m.version))
                          : 0;
  }

  private async recordMigration(migration: MigrationScript): Promise<void> {
    const checksum = this.generateChecksum(migration);

    await this.db.create<DBMigration>(this.migrationTableName, {
      version: migration.version,
      name: migration.constructor.name,
      appliedAt: new Date(),
      checksum,
      script: migration.toString(),
    });
  }

  private async removeMigration(migration: MigrationScript): Promise<void> {
    await this.db.where<DBMigration>(this.migrationTableName, {
      version: migration.version,
    }).then(migrations =>
      Promise.all(migrations.map(m =>
        this.db.delete(this.migrationTableName, m.id!),
      )),
    );
  }

  private generateChecksum(migration: MigrationScript): string {
    let hash = 0;
    const str = migration.toString();

    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return `c${hash}`;
  }
}
