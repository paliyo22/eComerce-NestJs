import { PrimaryColumn } from "typeorm";
import { uuidTransformer } from "./uuid-transformer";

export function PrimaryBinaryUuidColumn(options: Record<string, any> = {}) {
  return PrimaryColumn({
    type: 'binary',
    length: 16,
    transformer: uuidTransformer,
    ...options,
  });
}