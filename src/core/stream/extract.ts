import { todo } from '../todo';

/** stream[i] = data[offsets[i]] */
export function extract(data: Uint8ClampedArray, offsets: Uint32Array): Uint8Array {
  return todo('extract');
}

/** data[offsets[i]] = bytes[i]. Mutates `data`; callers pass a copy of the base image. */
export function insert(data: Uint8ClampedArray, offsets: Uint32Array, bytes: Uint8Array): void {
  todo('insert');
}
