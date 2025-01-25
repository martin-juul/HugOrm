import { Relationship } from './Relationship.js';
import { Model } from '../models/Model.js';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class MorphMany<T extends Model, R extends Model> extends Relationship<T, R> {
  constructor(
    public relatedModel: IModelConstructor<R>,
    protected morphType: keyof T,
    protected morphId: keyof T,
  ) {
    super(relatedModel, null!);
  }

  async resolve(source: T): Promise<R[]> {
    return this.relatedModel.where({
      [this.morphType]: source.constructor.name.toLowerCase(),
      [this.morphId]: source.id,
    } as unknown as Partial<R>);
  }
}
