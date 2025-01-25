import { Model } from '@martinjuul/hugorm/models/Model';
import { Relationship } from '@martinjuul/hugorm/relationships/Relationship';

export class BelongsTo<T extends Model, R extends Model> extends Relationship<T, R> {
  async resolve(source: T): Promise<R | null> {
    const foreignValue = source[this.foreignKey];
    if (!foreignValue) {
      return null;
    }

    const modelClass = this.getRelatedModel(); // Get constructor when needed
    return modelClass.find(foreignValue as number);
  }
}
