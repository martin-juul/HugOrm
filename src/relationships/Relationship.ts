import { Model } from '../models/Model.js';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export abstract class Relationship<T extends Model, R extends Model> {
  constructor(
    protected getRelatedModel: () => IModelConstructor<R>, // Accept a function that returns the constructor
    protected foreignKey: keyof T,
  ) {
  }

  abstract resolve(source: T): Promise<R | R[] | null>;
}
