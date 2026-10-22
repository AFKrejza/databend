// Linear PCM encodings. See docs/codec.md#linear-pcm-pcmts.
import { sanitizeSample } from './sanitize';

export type Endian = 'be' | 'le';

/** (b - 128) / 128 */
export function decodeU8(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = (bytes[i] - 128) / 128;
  return out;
}

export function encodeU8(samples: Float32Array, outLength: number): Uint8Array {
  const out = new Uint8Array(outLength).fill(128);
  const n = Math.min(outLength, samples.length);
  for (let i = 0; i < n; i++) out[i] = clamp(Math.round(sanitizeSample(samples[i]) * 128) + 128, 0, 255);
  return out;
}

/** Byte as int8, / 128 */
export function decodeS8(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = ((bytes[i] << 24) >> 24) / 128;
  return out;
}

export function encodeS8(samples: Float32Array, outLength: number): Uint8Array {
  const out = new Uint8Array(outLength);
  const n = Math.min(outLength, samples.length);
  for (let i = 0; i < n; i++) out[i] = clamp(Math.round(sanitizeSample(samples[i]) * 128), -128, 127) & 0xff;
  return out;
}

/** Byte pairs → int16 / 32768. An odd trailing byte is padded with 0. */
export function decodeS16(bytes: Uint8Array, endian: Endian): Float32Array {
  const out = new Float32Array(Math.ceil(bytes.length / 2));
  for (let i = 0; i < out.length; i++) {
    const a = bytes[2 * i];
    const b = 2 * i + 1 < bytes.length ? bytes[2 * i + 1] : 0;
    const word = endian === 'be' ? (a << 8) | b : (b << 8) | a;
    out[i] = ((word << 16) >> 16) / 32768;
  }
  return out;
}

/** Drops the padding byte again, so the result is exactly `outLength` bytes. */
export function encodeS16(samples: Float32Array, endian: Endian, outLength: number): Uint8Array {
  const out = new Uint8Array(outLength);
  const n = Math.min(Math.ceil(outLength / 2), samples.length);
  for (let i = 0; i < n; i++) {
    const word = clamp(Math.round(sanitizeSample(samples[i]) * 32768), -32768, 32767) & 0xffff;
    const hi = word >> 8;
    const lo = word & 0xff;
    out[2 * i] = endian === 'be' ? hi : lo;
    if (2 * i + 1 < outLength) out[2 * i + 1] = endian === 'be' ? lo : hi;
  }
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
