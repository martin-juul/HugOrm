import { Relationship } from '@martinjuul/hugorm/relationships/Relationship';
import { Model } from '@martinjuul/hugorm/models/Model';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class MorphMany<T extends Model, R extends Model> extends Relationship<T, R> {
  constructor(
    getRelatedModel: () => IModelConstructor<R>, // Changed to function getter
    private morphType: keyof T,
    morphId: keyof T,
  ) {
    super(getRelatedModel, morphId);
  }

  async resolve(source: T): Promise<R[]> {
    const modelClass = this.getRelatedModel(); // Get constructor when needed
    return modelClass.where({
      [this.morphType]: source.constructor.name.toLowerCase(),
      [this.foreignKey]: source.id,
    } as unknown as Partial<R>);
  }
}
