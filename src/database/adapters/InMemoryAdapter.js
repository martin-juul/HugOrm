class InMemoryAdapter {
  constructor() {
    this.data = {};
  }

  async find(table, id) {
    return this.data[table]?.find(record => record.id === id);
  }

  async create(table, data) {
    if (!this.data[table]) this.data[table] = [];
    const record = { ...data, id: this.data[table].length + 1 };
    this.data[table].push(record);
    return record;
  }

  async update(table, id, data) {
    const record = await this.find(table, id);
    if (record) Object.assign(record, data);
    return record;
  }

  async delete(table, id) {
    this.data[table] = this.data[table].filter(record => record.id !== id);
    return true;
  }

  async all(table) {
    return this.data[table] || [];
  }

  async where(table, conditions) {
    return this.data[table]?.filter(record => {
      return Object.keys(conditions).every(key => record[key] === conditions[key]);
    });
  }

  async query(table, callback) {
    return this.data[table]?.filter(callback);
  }
}

export default InMemoryAdapter;