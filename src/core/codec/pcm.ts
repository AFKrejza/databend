// Linear PCM encodings. See docs/codec.md#linear-pcm-pcmts.
import { todo } from '../todo';

export type Endian = 'be' | 'le';

/** (b - 128) / 128 */
export function decodeU8(bytes: Uint8Array): Float32Array {
  return todo('decodeU8');
}

export function encodeU8(samples: Float32Array, outLength: number): Uint8Array {
  return todo('encodeU8');
}

/** Byte as int8, / 128 */
export function decodeS8(bytes: Uint8Array): Float32Array {
  return todo('decodeS8');
}

export function encodeS8(samples: Float32Array, outLength: number): Uint8Array {
  return todo('encodeS8');
}

/** Byte pairs → int16 / 32768. An odd trailing byte is padded with 0. */
export function decodeS16(bytes: Uint8Array, endian: Endian): Float32Array {
  return todo('decodeS16');
}

/** Drops the padding byte again, so the result is exactly `outLength` bytes. */
export function encodeS16(samples: Float32Array, endian: Endian, outLength: number): Uint8Array {
  return todo('encodeS16');
}
