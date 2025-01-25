import { Model } from '@martinjuul/hugorm/models/Model';
import { Relationship } from '@martinjuul/hugorm/relationships/Relationship';

export class HasOne<T extends Model, R extends Model> extends Relationship<T, R> {
  async resolve(source: T): Promise<R | null> {
    const id = source[this.foreignKey] as unknown as number;
    const relatedModel = this.getRelatedModel(); // Call the function to get the constructor
    return relatedModel.find(id);
  }
}
