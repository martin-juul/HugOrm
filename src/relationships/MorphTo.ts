import { Relationship } from './Relationship.js';
import { Model } from '../models/Model.js';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class MorphTo<T extends Model> extends Relationship<T, Model> {
  constructor(
    protected relatedModels: Record<string, IModelConstructor<Model>>,
    protected morphType: keyof T,
    protected morphId: keyof T,
  ) {
    super(null!, null!);
  }

  async resolve(source: T): Promise<Model | null> {
    const type = source[this.morphType] as string;
    const id = source[this.morphId] as number;
    const relatedModel = this.relatedModels[type];
    return relatedModel?.find(id) ?? null;
  }
}
