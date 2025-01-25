import 'reflect-metadata';
import { Database } from '../database/Database.js';
import { EventEmitter } from '../events/EventEmitter.js';
import { Paginator } from '../pagination/Paginator.js';
import { RELATIONSHIP_METADATA_KEY } from '../relationships/constants.js';
import { MorphMany } from '../relationships/MorphMany.js';
import { MorphTo } from '../relationships/MorphTo.js';
import { HasOne } from '../relationships/HasOne.js';
import { HasMany } from '../relationships/HasMany.js';
import { BelongsTo } from '../relationships/BelongsTo.js';
import { BelongsToMany } from '../relationships/BelongsToMany.js';
import { IModel, IModelConstructor, ModelEvents } from './IModel.js';
import { createError } from '@martinjuul/hugorm/utils/errorUtils';
import { ILogger } from '@martinjuul/hugorm/database/logger/ILogger';
import { ConsoleLogger } from '@martinjuul/hugorm/database/logger/ConsoleLogger';

export interface SoftDeletes {
  getDeletedAtFieldName(): string;
}

const prepareSoftDelete = (model: Model) => {
  const deletedAtFieldName = (model as unknown as SoftDeletes).getDeletedAtFieldName();
  if (deletedAtFieldName) {
    Object.assign(model, { [deletedAtFieldName]: new Date() });
  }
};

export class Model<T extends IModel<T> = any> implements IModel<T> {
  static logger: ILogger = new ConsoleLogger();
  protected static defaultConnection: Database | null = null; // Global default
  protected static connection: Database | null = null; // Per-model override
  protected static timestamps = true;
  protected static softDeletes = false;
  protected static touches: string[] = [];

  id?: number;
  _instanceEvents: EventEmitter<ModelEvents<T>> = new EventEmitter();
  _originalState: Partial<T> = {};

  constructor(data?: Partial<T>) {
    if (data) {
      Object.assign(this, data);
      this._originalState = { ...data };
    }
  }

  static _events: EventEmitter<ModelEvents<any>> = new EventEmitter();

  static get events(): EventEmitter<ModelEvents<any>> {
    return this._events;
  }

  static get database(): Database {
    // Use per-model connection if set
    if (this.connection) {
      return this.connection;
    }
    // Fall back to global default
    if (Model.defaultConnection) {
      return Model.defaultConnection;
    }
    throw new Error('Database not configured. Call Model.setDatabase() first.');
  }

  static get table(): string {
    return this.name.toLowerCase() + 's';
  }

  get table(): string {
    return (this.constructor as typeof Model).table;
  }

  get database(): Database {
    return (this.constructor as typeof Model).database;
  }

  get events(): EventEmitter<ModelEvents<T>> {
    return (this.constructor as typeof Model).events;
  }

  get softDeletes(): boolean {
    return (this.constructor as typeof Model).softDeletes;
  }

  get timestamps(): boolean {
    return (this.constructor as typeof Model).timestamps;
  }

  static setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  // Set the global default database (for all models)
  static setDatabase(database: Database): void {
    Model.defaultConnection = database;
  }

  // Set a specific connection for this model
  static setConnection(database: Database): void {
    this.connection = database;
  }

  static async create<T extends IModel<T>>(
    this: IModelConstructor<T>,
    data: Partial<T>,
  ): Promise<T> {
    try {
      const instance = new this(data);
      await instance.save();
      return instance;
    } catch (error) {
      this.events.emit('error', { operation: 'create', error });
      throw createError(`Failed to create ${this.table} record`, error);
    }
  }

  static async all<T extends IModel<T>>(this: IModelConstructor<T>): Promise<T[]> {
    const records = await this.database.all<T>(this.table);
    return records.map(record => new this(record));
  }

  static async where<T extends IModel<T>>(
    this: IModelConstructor<T>,
    conditions: Partial<T>,
  ): Promise<T[]> {
    const records = await this.database.where<T>(this.table, conditions);
    return records.map(record => new this(record));
  }

  static async query<T extends IModel<T>>(this: IModelConstructor<T>, callback: (record: T) => boolean): Promise<T[]> {
    const records = await this.database.query<T>(this.table, callback);
    return records.map(record => new this(record));
  }

  static async paginate<T extends IModel<T>>(
    this: IModelConstructor<T>,
    perPage: number = 15,
    page: number = 1,
  ): Promise<Paginator<T>> {
    const records = await this.all();
    return new Paginator(
      records.slice((page - 1) * perPage, page * perPage),
      records.length,
      perPage,
      page,
    );
  }

  static async withTrashed<T extends IModel<T>>(this: IModelConstructor<T>): Promise<T[]> {
    return this.database.where<T>(this.table, { deleted_at: { $ne: null } });
  }

  // CRUD Operations
  async find(id: number): Promise<T | null> {
    const record = await this.database.find<T>(this.table, id);
    if (record) {
      Object.assign(this, record);
      this._originalState = { ...record };
      return this as unknown as T;
    }
    return null;
  }

  async update(data: Partial<T>): Promise<this> {
    try {
      if (typeof this.id === 'undefined') {
        throw new Error('Cannot update unsaved record');
      }

      Object.assign(this, data);
      await this.save();
      return this;
    } catch (error) {
      this.events.emit('error', { operation: 'update', error });
      throw createError(`Failed to update ${this.table} record`, error);
    }
  }

  async save(): Promise<this> {
    const data: Partial<T> = { ...(this as unknown as T) };

    const now = new Date();
    if (this.timestamps) {
      if (!this.id) {
        (this as any).created_at = now;
      }
      (this as any).updated_at = now;
    }

    try {
      if (this.id) {
        this.events.emit('updating', data);
        const updated = await this.database.update<T>(this.table, this.id, data);
        this._originalState = { ...(this as unknown as T) };
        this.events.emit('updated', this as unknown as T);
      } else {
        this.events.emit('creating', data);
        const created = await this.database.create<T>(this.table, data);
        this.id = created.id;
        this._originalState = { ...(this as unknown as T) };
        this.events.emit('created', this as unknown as T);
      }

      // Touch related parents after save
      const touches = (this.constructor as typeof Model).touches;
      if (touches.length > 0) {
        for (const relation of touches) {
          try {
            const parent = await this.resolveRelationship(relation);
            if (Array.isArray(parent)) {
              await Promise.all(parent.map(p => p.touch()));
            } else if (parent) {
              await parent.touch();
            }
          } catch (error) {
            console.error(`Failed to touch relation "${relation}":`, error);
          }
        }
      }
      return this;
    } catch (error) {
      this.events.emit('error', { operation: 'save', error });
      throw createError(`Model save failed for ${this.table}`, error);
    }
  }

  async delete(): Promise<boolean> {
    if (!this.id) {
      throw new Error('Cannot delete a record without an ID.');
    }

    if (this.softDeletes) {
      prepareSoftDelete(this);
    }

    try {
      this.events.emit('deleting', this as unknown as T);
      const result = await this.database.delete(this.table, this.id);
      this.events.emit('deleted', this as unknown as T);
      return result;
    } catch (error) {
      this.events.emit('error', { operation: 'delete', error });
      throw error;
    }
  }

  isDirty(): boolean {
    return Object.keys(this.getDiff()).length > 0;
  }

  getDiff(): Partial<T> {
    const diff: Partial<T> = {};
    const self = this as unknown as T;

    for (const key in self) {
      if (
        self.hasOwnProperty(key) &&
        self[key] !== this._originalState[key]
      ) {
        diff[key] = self[key];
      }
    }
    return diff;
  }

  // Relationships
  hasOne<R extends IModel<R>>(
    relatedModel: IModelConstructor<R>,
    foreignKey: keyof T,
  ): void {
    const relationship = new HasOne<T, R>(relatedModel, foreignKey);
    Reflect.defineMetadata(RELATIONSHIP_METADATA_KEY, relationship, this, foreignKey as string);
  }

  hasMany<R extends IModel<R>>(
    relatedModel: IModelConstructor<R>,
    foreignKey: keyof T,
  ): void {
    const relationship = new HasMany<T, R>(relatedModel, foreignKey);
    Reflect.defineMetadata(RELATIONSHIP_METADATA_KEY, relationship, this, foreignKey as string);
  }

  belongsTo<R extends IModel<R>>(
    relatedModel: IModelConstructor<R>,
    foreignKey: keyof T,
  ): void {
    const relationship = new BelongsTo<T, R>(relatedModel, foreignKey);
    Reflect.defineMetadata(RELATIONSHIP_METADATA_KEY, relationship, this, foreignKey as string);
  }

  belongsToMany<R extends IModel<R>>(
    relatedModel: IModelConstructor<R>,
    pivotTable: string,
    foreignKey: keyof T,
    relatedKey: keyof R,
  ): void {
    const relationship = new BelongsToMany<T, R>(relatedModel, pivotTable, foreignKey, relatedKey);
    Reflect.defineMetadata(RELATIONSHIP_METADATA_KEY, relationship, this, foreignKey as string);
  }

  morphTo(
    relatedModels: Record<string, IModelConstructor<Model>>,
    morphType: keyof T,
    morphId: keyof T,
  ): void {
    const relationship = new MorphTo<T>(relatedModels, morphType, morphId);
    Reflect.defineMetadata(RELATIONSHIP_METADATA_KEY, relationship, this, morphType as string);
  }

  morphMany<R extends IModel<R>>(
    relatedModel: IModelConstructor<R>,
    morphType: keyof T,
    morphId: keyof T,
  ): void {
    const relationship = new MorphMany<T, R>(relatedModel, morphType, morphId);
    Reflect.defineMetadata(RELATIONSHIP_METADATA_KEY, relationship, this, morphType as string);
  }

  async resolveRelationship(propertyKey: string): Promise<any> {
    const relationship = Reflect.getMetadata(RELATIONSHIP_METADATA_KEY, this, propertyKey);
    if (!relationship) {
      throw new Error(`No relationship defined for property: ${propertyKey}`);
    }
    return relationship.resolve(this);
  }

  on<Event extends keyof ModelEvents<T>>(event: Event, listener: (payload: ModelEvents<T>[Event]) => void): void {
    this._instanceEvents.on(event, listener);
  }

  async touch(): Promise<void> {
    if (typeof this.id === 'undefined') {
      return;
    }
    const now = new Date();
    await this.database.update<T>(this.table, this.id, { updatedAt: now } as Partial<T>);

    (this as unknown as T).updatedAt = now;
    this._originalState = { ...(this as unknown as T) };
  }
}
