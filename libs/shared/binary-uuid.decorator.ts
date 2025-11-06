import { ColumnOptions, Column } from "typeorm";
import { uuidTransformer } from "./uuid-transformer";

export function BinaryUuidColumn(options: Omit<ColumnOptions, 'type' | 'length' | 'transformer'> = {}) {
  return Column({
    type: 'binary',
    length: 16,
    transformer: uuidTransformer,
    ...options,
  });
}