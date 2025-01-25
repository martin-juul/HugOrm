import Database from '../database/Database';
import InMemoryAdapter from '../database/adapters/InMemoryAdapter';

class Model {
  static database = new Database(new InMemoryAdapter());

  static setDatabase(database) {
    this.database = database;
  }

  static get table() {
    return this.name.toLowerCase() + 's';
  }

  static async find(id) {
    return this.database.find(this.table, id);
  }

  static async create(data) {
    return this.database.create(this.table, data);
  }

  static async all() {
    return this.database.all(this.table);
  }

  static async where(conditions) {
    return this.database.where(this.table, conditions);
  }

  static async query(callback) {
    return this.database.query(this.table, callback);
  }

  async save() {
    if (this.id) {
      return this.constructor.database.update(this.constructor.table, this.id, this);
    } else {
      const record = await this.constructor.database.create(this.constructor.table, this);
      this.id = record.id;
      return record;
    }
  }

  async delete() {
    return this.constructor.database.delete(this.constructor.table, this.id);
  }
}

export default Model;