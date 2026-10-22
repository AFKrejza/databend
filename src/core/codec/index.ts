// Bytes ⇄ float samples. See docs/codec.md.
import type { Encoding } from '../types';
import { decodeMulaw, encodeMulaw } from './mulaw';
import { decodeAlaw, encodeAlaw } from './alaw';
import { decodeU8, encodeU8, decodeS8, encodeS8, decodeS16, encodeS16 } from './pcm';

/** Bytes per sample: 2 for the 16-bit encodings, 1 otherwise. */
export function bytesPerSample(enc: Encoding): 1 | 2 {
  return enc === 's16be' || enc === 's16le' ? 2 : 1;
}

export function decode(bytes: Uint8Array, enc: Encoding): Float32Array {
  switch (enc) {
    case 'mulaw': return decodeMulaw(bytes);
    case 'alaw': return decodeAlaw(bytes);
    case 'u8': return decodeU8(bytes);
    case 's8': return decodeS8(bytes);
    case 's16be': return decodeS16(bytes, 'be');
    case 's16le': return decodeS16(bytes, 'le');
  }
}

/** Always returns exactly `outLength` bytes (the original stream length). */
export function encode(samples: Float32Array, enc: Encoding, outLength: number): Uint8Array {
  switch (enc) {
    case 'mulaw': return encodeMulaw(samples, outLength);
    case 'alaw': return encodeAlaw(samples, outLength);
    case 'u8': return encodeU8(samples, outLength);
    case 's8': return encodeS8(samples, outLength);
    case 's16be': return encodeS16(samples, 'be', outLength);
    case 's16le': return encodeS16(samples, 'le', outLength);
  }
}

export { sanitizeSample } from './sanitize';
