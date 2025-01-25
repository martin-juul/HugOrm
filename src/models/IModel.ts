import { Paginator } from '@martinjuul/hugorm/pagination/Paginator';
import { EventEmitter } from '@martinjuul/hugorm/events/EventEmitter';
import { Database } from '@martinjuul/hugorm/database/Database';

export type ModelEvents<T> = {
  creating: Partial<T>;
  created: T;
  updating: Partial<T>;
  updated: T;
  deleting: T;
  deleted: T;
  error: { operation: string; error: any };
};

export interface IModel<T = any> {
  id?: number;
  _instanceEvents: EventEmitter<ModelEvents<T>>;
  _originalState: Partial<T>;
  table: string;
  database: Database;
  events: EventEmitter<ModelEvents<T>>;

  find(id: number): Promise<T | null>;

  save(): Promise<this>;

  update(data: Partial<T>): Promise<this>;

  delete(): Promise<boolean>;

  isDirty(): boolean;

  getDiff(): Partial<T>;

  // Relationships
  hasOne<R extends IModel<R>>(relatedModel: new () => R, foreignKey: keyof T): void;

  hasMany<R extends IModel<R>>(relatedModel: new () => R, foreignKey: keyof T): void;

  belongsTo<R extends IModel<R>>(relatedModel: new () => R, foreignKey: keyof T): void;

  belongsToMany<R extends IModel<R>>(
    relatedModel: new () => R,
    pivotTable: string,
    foreignKey: keyof T,
    relatedKey: keyof R,
  ): void;

  morphTo(relatedModels: Record<string, new () => IModel<any>>, morphType: keyof T, morphId: keyof T): void;

  morphMany<R extends IModel<R>>(relatedModel: new () => R, morphType: keyof T, morphId: keyof T): void;

  resolveRelationship(propertyKey: string): Promise<any>;

  // Events
  on<Event extends keyof ModelEvents<T>>(event: Event, listener: (payload: ModelEvents<T>[Event]) => void): void;
}

export interface IModelConstructor<T extends IModel<T>> {
  database: Database;
  table: string;
  events: EventEmitter<ModelEvents<any>>;

  new(data?: Partial<T>): T;

  create(data: Partial<T>): Promise<T>;

  all(): Promise<T[]>;

  where(conditions: Partial<T>): Promise<T[]>;

  query(callback: (record: T) => boolean): Promise<T[]>;

  paginate(perPage?: number, page?: number): Promise<Paginator<T>>;

  find(id: number): Promise<T | null>;

  setDatabase(database: Database): void;
}
