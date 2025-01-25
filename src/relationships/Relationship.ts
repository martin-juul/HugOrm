import { Model } from '../models/Model.js';

export abstract class Relationship<T extends Model, R extends Model> {
  constructor(
    protected relatedModel: new () => R,
    protected foreignKey: keyof T,
  ) {
  }

  abstract resolve(source: T): Promise<R | R[] | null>;
}
