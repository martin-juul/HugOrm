import 'reflect-metadata';
import { Model } from '../models/Model';
import { RELATIONSHIP_METADATA_KEY } from '@martinjuul/hugorm/relationships/constants';

type Constructor<TResult, TParams extends any[] = any[]> = new (
  ...params: TParams
) => TResult;

export function hugmodel() {
  return function <T extends Constructor<Model>>(constructor: T) {
    class HugModel extends constructor {
      private static _hugRegistered = true;

      static get relationships(): any[] {
        return Reflect.getMetadata(RELATIONSHIP_METADATA_KEY, this) || [];
      }
    }

    // Copy static properties from original constructor
    Object.getOwnPropertyNames(constructor).forEach(prop => {
      if (prop !== 'length' && prop !== 'name' && prop !== 'prototype') {
        Object.defineProperty(
          HugModel,
          prop,
          Object.getOwnPropertyDescriptor(constructor, prop) || Object.create(null),
        );
      }
    });

    // Preserve original static properties
    Object.defineProperty(HugModel, 'name', { value: constructor.name });

    return HugModel as typeof constructor;
  };
}
