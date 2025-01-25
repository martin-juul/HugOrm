import { Relationship } from './Relationship.js';
import { Model } from '../models/Model.js';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class BelongsTo<T extends Model, R extends Model> extends Relationship<T, R> {
  constructor(
    public relatedModel: IModelConstructor<R>,
    public foreignKey: keyof T,
  ) {
    super(relatedModel, foreignKey);
  }

  async resolve(source: T): Promise<R | null> {
    const id = source[this.foreignKey] as unknown as number;
    return this.relatedModel.find(id);
  }
}
