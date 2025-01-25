import { Model } from '../models/Model';
import { RELATIONSHIP_METADATA_KEY } from '../relationships/constants';
import { IModelConstructor } from '../models/IModel';
import { HasOne } from '@martinjuul/hugorm/relationships/HasOne';
import { HasMany } from '@martinjuul/hugorm/relationships/HasMany';
import { BelongsTo } from '@martinjuul/hugorm/relationships/BelongsTo';
import { BelongsToMany } from '@martinjuul/hugorm/relationships/BelongsToMany';
import { MorphTo } from '@martinjuul/hugorm/relationships/MorphTo';
import { MorphMany } from '@martinjuul/hugorm/relationships/MorphMany';

type RelationshipConfig<T extends Model, R extends Model> = {
  type: () => IModelConstructor<R>;
  foreignKey: keyof T;
};

type ManyToManyConfig<T extends Model, R extends Model> = RelationshipConfig<T, R> & {
  pivotTable: string;
  relatedKey: keyof R;
};

type PolymorphicConfig<T extends Model> = {
  morphType: keyof T;
  morphId: keyof T;
};

export function hasOne<T extends Model, R extends Model>(config: RelationshipConfig<T, R>) {
  return function (target: T, propertyKey: string) {
    // Pass the function directly instead of calling it
    const relationship = new HasOne(config.type, config.foreignKey);
    Reflect.defineMetadata(
      RELATIONSHIP_METADATA_KEY,
      relationship,
      target.constructor,
      propertyKey,
    );
  };
}


export function hasMany<T extends Model, R extends Model>(config: RelationshipConfig<T, R>) {
  return function (target: T, propertyKey: string) {
    const relationship = new HasMany(config.type, config.foreignKey);
    Reflect.defineMetadata(
      RELATIONSHIP_METADATA_KEY,
      relationship,
      target.constructor,
      propertyKey,
    );
  };
}

export function belongsTo<T extends Model, R extends Model>(config: RelationshipConfig<T, R>) {
  return function (target: T, propertyKey: string) {
    const relationship = new BelongsTo(config.type, config.foreignKey);
    Reflect.defineMetadata(
      RELATIONSHIP_METADATA_KEY,
      relationship,
      target.constructor,
      propertyKey,
    );
  };
}

export function belongsToMany<T extends Model, R extends Model>(config: ManyToManyConfig<T, R>) {
  return function (target: T, propertyKey: string) {
    const relationship = new BelongsToMany(
      config.type,
      config.pivotTable,
      config.foreignKey,
      config.relatedKey,
    );
    Reflect.defineMetadata(
      RELATIONSHIP_METADATA_KEY,
      relationship,
      target.constructor,
      propertyKey,
    );
  };
}

export function morphTo<T extends Model>(config: PolymorphicConfig<T> & {
  relatedModels: () => Record<string, IModelConstructor<Model>>
}) {
  return function (target: T, propertyKey: string) {
    const relationship = new MorphTo(
      config.relatedModels,
      config.morphType,
      config.morphId,
    );
    Reflect.defineMetadata(
      RELATIONSHIP_METADATA_KEY,
      relationship,
      target.constructor,
      propertyKey,
    );
  };
}


export function morphMany<T extends Model, R extends Model>(config: PolymorphicConfig<T> & {
  type: () => IModelConstructor<R>
}) {
  return function (target: T, propertyKey: string) {
    const relationship = new MorphMany(
      config.type,
      config.morphType,
      config.morphId,
    );
    Reflect.defineMetadata(
      RELATIONSHIP_METADATA_KEY,
      relationship,
      target.constructor,
      propertyKey,
    );
  };
}
