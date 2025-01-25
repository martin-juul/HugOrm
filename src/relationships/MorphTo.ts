import { Relationship } from './Relationship';
import { Model } from '../models/Model';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class MorphTo<T extends Model> extends Relationship<T, Model> {
  private morphType: keyof T;

  constructor(
    private getRelatedModels: () => Record<string, IModelConstructor<Model>>, // Changed to function getter
    morphType: keyof T,
    morphId: keyof T,
  ) {
    super(null!, morphId);
    this.morphType = morphType;
  }

  async resolve(source: T): Promise<Model | null> {
    const targetType = source[this.morphType] as string;
    const targetId = source[this.foreignKey] as number;
    const models = this.getRelatedModels(); // Get models when needed

    const modelClass = models[targetType];
    return modelClass?.find(targetId) ?? null;
  }
}
