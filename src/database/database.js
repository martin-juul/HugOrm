class Database {
  constructor(adapter) {
    this.adapter = adapter;
  }

  async find(table, id) {
    return this.adapter.find(table, id);
  }

  async create(table, data) {
    return this.adapter.create(table, data);
  }

  async update(table, id, data) {
    return this.adapter.update(table, id, data);
  }

  async delete(table, id) {
    return this.adapter.delete(table, id);
  }

  async all(table) {
    return this.adapter.all(table);
  }

  async where(table, conditions) {
    return this.adapter.where(table, conditions);
  }

  async query(table, callback) {
    return this.adapter.query(table, callback);
  }
}

export default Database;