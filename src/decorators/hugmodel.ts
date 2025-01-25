import { Model } from '@martinjuul/hugorm/models/Model';
import { ModelContainer } from '@martinjuul/hugorm/container/ModelContainer';
import { RELATIONSHIP_METADATA_KEY } from '@martinjuul/hugorm/relationships/constants';

type Constructor<T = {}> = new (...args: any[]) => T;

export function hugmodel() {
  return function <T extends Constructor<Model>>(constructor: T) {
    const HugModel = class extends constructor {
      private static _hugRegistered = true;

      constructor(...args: any[]) {
        super(...args);

        ModelContainer.register(this);

        if (!this.database.hasTable(this.table)) {
          this.database.createTable(this.table);
        }
      }

      static get relationships(): any[] {
        return Reflect.getMetadata(RELATIONSHIP_METADATA_KEY, this) || [];
      }

      async softDelete(): Promise<this> {
        return this.update({ deletedAt: new Date() });
      }
    };

    Object.assign(HugModel, constructor);

    Object.defineProperty(HugModel, 'name', {
      value: constructor.name,
      writable: false,
    });

    return HugModel as typeof constructor;
  };
}
