import { Relationship } from './Relationship.js';
import { Model } from '../models/Model.js';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class HasMany<T extends Model, R extends Model> extends Relationship<T, R> {
  constructor(
    public relatedModel: IModelConstructor<R>,
    public foreignKey: keyof T,
  ) {
    super(relatedModel, foreignKey);
  }

  async resolve(source: T): Promise<R[]> {
    return this.relatedModel.where({
      [this.foreignKey]: source.id,
    } as Partial<R>);
  }
}
