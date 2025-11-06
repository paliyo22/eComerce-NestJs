import { parse, stringify } from 'uuid';

function uuidToBuffer(uuid: string): Buffer {
  return Buffer.from(parse(uuid));
}

function bufferToUuid(buffer: Buffer): string {
  return stringify(buffer);
}

export const uuidTransformer = {
  to: (value: string | null) => (value ? uuidToBuffer(value) : null),
  from: (value: Buffer | null) => (value ? bufferToUuid(value) : null),
};