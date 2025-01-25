import { MigrationScript } from '@martinjuul/hugorm/models/MigrationScript';
import { Database } from '@martinjuul/hugorm/database/Database';

export class DefaultMigration implements MigrationScript {
  constructor(private db: Database) {
  }

  async up(): Promise<void> {
    // Create the migrations table if it doesn't exist
    await this.db.create('migrations', {
      tableName: 'migrations',
      version: 0,
      migrationScript: 'DefaultMigration',
    });
  }

  async down(): Promise<void> {
    // Drop the migrations table
    await this.db.delete('migrations', 1); // Assuming the table has an ID of 1
  }
}
