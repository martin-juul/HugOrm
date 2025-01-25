class LocalStorageAdapter {
  constructor() {
    if (!window.localStorage) throw new Error('LocalStorage is not supported.');
  }

  async find(table, id) {
    const records = JSON.parse(localStorage.getItem(table) || '[]');
    return records.find(record => record.id === id);
  }

  async create(table, data) {
    const records = JSON.parse(localStorage.getItem(table) || '[]');
    const record = { ...data, id: records.length + 1 };
    records.push(record);
    localStorage.setItem(table, JSON.stringify(records));
    return record;
  }

  async update(table, id, data) {
    const records = JSON.parse(localStorage.getItem(table) || '[]');
    const record = records.find(record => record.id === id);
    if (record) Object.assign(record, data);
    localStorage.setItem(table, JSON.stringify(records));
    return record;
  }

  async delete(table, id) {
    const records = JSON.parse(localStorage.getItem(table) || '[]');
    const filteredRecords = records.filter(record => record.id !== id);
    localStorage.setItem(table, JSON.stringify(filteredRecords));
    return true;
  }

  async all(table) {
    return JSON.parse(localStorage.getItem(table) || '[]');
  }

  async where(table, conditions) {
    const records = JSON.parse(localStorage.getItem(table) || '[]');
    return records.filter(record => {
      return Object.keys(conditions).every(key => record[key] === conditions[key]);
    });
  }

  async query(table, callback) {
    const records = JSON.parse(localStorage.getItem(table) || '[]');
    return records.filter(callback);
  }
}

export default LocalStorageAdapter;