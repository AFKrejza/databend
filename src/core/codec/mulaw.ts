// ITU G.711 μ-law, as used by libsndfile/Audacity. See docs/codec.md#μ-law-default-mulawts.
import { isNegative, sanitizeSample } from './sanitize';

const BIAS = 0x84;
const CLIP = 32635;

/** Decode one byte. 0x7F decodes to -0 so the round trip is lossless. */
export function mulawDecodeByte(byte: number): number {
  const u = ~byte & 0xff;
  const exponent = (u >> 4) & 7;
  const mantissa = u & 0x0f;
  const magnitude = (((mantissa << 3) + BIAS) << exponent) - BIAS;
  return (u & 0x80 ? -magnitude : magnitude) / 32768;
}

/** Encode one sample in [-1, 1). Uses the sign bit, so -0 → 0x7F. */
export function mulawEncodeSample(x: number): number {
  x = sanitizeSample(x);
  const sign = isNegative(x) ? 0x80 : 0;
  const s = Math.min(Math.round(Math.abs(x) * 32768), CLIP) + BIAS;
  const exponent = 31 - Math.clz32(s) - 7;
  const mantissa = (s >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

const DECODE_TABLE = new Float32Array(256);
for (let b = 0; b < 256; b++) DECODE_TABLE[b] = mulawDecodeByte(b);

export function decodeMulaw(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = DECODE_TABLE[bytes[i]];
  return out;
}

export function encodeMulaw(samples: Float32Array, outLength: number): Uint8Array {
  const out = new Uint8Array(outLength);
  const n = Math.min(outLength, samples.length);
  for (let i = 0; i < n; i++) out[i] = mulawEncodeSample(samples[i]);
  // Missing samples are silence (+0).
  if (n < outLength) out.fill(0xff, n);
  return out;
}
