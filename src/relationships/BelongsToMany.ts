import { Relationship } from './Relationship.js';
import { Model } from '../models/Model.js';
import { IModelConstructor } from '@martinjuul/hugorm/models/IModel';

export class BelongsToMany<T extends Model, R extends Model> extends Relationship<T, R> {
  constructor(
    public relatedModel: IModelConstructor<R>,
    protected pivotTable: string,
    foreignKey: keyof T,
    protected relatedKey: keyof R,
  ) {
    super(relatedModel, foreignKey);
  }

  async resolve(source: T): Promise<R[]> {
    type PivotRecord = Record<string, unknown> & {
      [K in typeof this.foreignKey | typeof this.relatedKey]: number
    };

    const pivotRecords = await this.relatedModel.database.where<PivotRecord>(
      this.pivotTable,
      { [this.foreignKey]: source.id } as Partial<PivotRecord>,
    );

    const relatedIds = pivotRecords.map(record =>
      Number(record[this.relatedKey as keyof PivotRecord]),
    );

    return this.relatedModel.where({
      id: relatedIds,
    } as unknown as Partial<R>);
  }
}
