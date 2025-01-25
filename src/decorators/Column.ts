import 'reflect-metadata';

export const COLUMN_METADATA_KEY = 'hugorm:columns';

export type ColumnOptions = {
  type: Function; // e.g., Date, String, Number
  nullable?: boolean;
};

export function Column(options: ColumnOptions) {
  return function (target: any, propertyKey: string) {
    const columns = Reflect.getMetadata(COLUMN_METADATA_KEY, target.constructor) || {};
    columns[propertyKey] = options;
    Reflect.defineMetadata(COLUMN_METADATA_KEY, columns, target.constructor);
  };
}

// Specialized decorators for common types
export const CreateDateColumn = () => Column({ type: Date });
export const UpdateDateColumn = () => Column({ type: Date });
export const PrimaryColumn = () => Column({ type: Number });
