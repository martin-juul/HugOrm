import { Model } from '@martinjuul/hugorm/models/Model';
import { Relationship } from '@martinjuul/hugorm/relationships/Relationship';

export class HasMany<T extends Model, R extends Model> extends Relationship<T, R> {
  async resolve(source: T): Promise<R[]> {
    const modelClass = this.getRelatedModel(); // Get constructor when needed
    return modelClass.where({
      [this.foreignKey]: source.id,
    } as unknown as Partial<R>);
  }
}
