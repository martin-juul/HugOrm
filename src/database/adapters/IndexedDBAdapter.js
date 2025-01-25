class IndexedDBAdapter {
  constructor(dbName = 'hugorm', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains('users')) {
          this.db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!this.db.objectStoreNames.contains('posts')) {
          this.db.createObjectStore('posts', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getStore(table) {
    if (!this.db) await this.connect();
    return this.db.transaction(table, 'readwrite').objectStore(table);
  }

  async find(table, id) {
    const store = await this.getStore(table);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async create(table, data) {
    const store = await this.getStore(table);
    return new Promise((resolve, reject) => {
      const request = store.add({ ...data, id: Date.now() });
      request.onsuccess = () => resolve({ ...data, id: request.result });
      request.onerror = () => reject(request.error);
    });
  }

  async update(table, id, data) {
    const store = await this.getStore(table);
    return new Promise((resolve, reject) => {
      const request = store.put({ ...data, id });
      request.onsuccess = () => resolve({ ...data, id });
      request.onerror = () => reject(request.error);
    });
  }

  async delete(table, id) {
    const store = await this.getStore(table);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async all(table) {
    const store = await this.getStore(table);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async where(table, conditions) {
    const records = await this.all(table);
    return records.filter(record => {
      return Object.keys(conditions).every(key => record[key] === conditions[key]);
    });
  }

  async query(table, callback) {
    const records = await this.all(table);
    return records.filter(callback);
  }
}

export default IndexedDBAdapter;