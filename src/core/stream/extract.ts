/** stream[i] = data[offsets[i]] */
export function extract(data: Uint8ClampedArray, offsets: Uint32Array): Uint8Array {
  const out = new Uint8Array(offsets.length);
  for (let i = 0; i < offsets.length; i++) out[i] = data[offsets[i]];
  return out;
}

/** data[offsets[i]] = bytes[i]. Mutates `data`; callers pass a copy of the base image. */
export function insert(data: Uint8ClampedArray, offsets: Uint32Array, bytes: Uint8Array): void {
  const n = Math.min(offsets.length, bytes.length);
  for (let i = 0; i < n; i++) data[offsets[i]] = bytes[i];
}
