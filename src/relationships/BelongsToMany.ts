import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';
import { Model } from '@martinjuul/hugorm/models/Model';
import { Relationship } from '@martinjuul/hugorm/relationships/Relationship';

export class BelongsToMany<T extends Model, R extends Model> extends Relationship<T, R> {
  constructor(
    getRelatedModel: () => IModelConstructor<R>, // Changed to function getter
    private pivotTable: string,
    foreignKey: keyof T,
    private relatedKey: keyof R,
  ) {
    super(getRelatedModel, foreignKey);
  }

  async resolve(source: T): Promise<R[]> {
    const modelClass = this.getRelatedModel(); // Get constructor when needed
    const pivotRecords = await modelClass.database.where<{ [key: string]: number }>(
      this.pivotTable,
      { [this.foreignKey]: source.id },
    );

    const relatedIds = pivotRecords.map(record => record[this.relatedKey as string]);
    return modelClass.where({ id: relatedIds } as unknown as Partial<R>);
  }
}
