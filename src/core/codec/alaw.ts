// ITU G.711 A-law. See docs/codec.md#a-law-alawts.
import { isNegative, sanitizeSample } from './sanitize';

export function alawDecodeByte(byte: number): number {
  const a = byte ^ 0x55;
  const exponent = (a >> 4) & 7;
  const mantissa = a & 0x0f;
  const magnitude = exponent === 0
    ? (mantissa << 4) + 8
    : ((mantissa << 4) + 0x108) << (exponent - 1);
  // In A-law a set sign bit means positive.
  return (a & 0x80 ? magnitude : -magnitude) / 32768;
}

export function alawEncodeSample(x: number): number {
  x = sanitizeSample(x);
  const sign = isNegative(x) ? 0 : 0x80;
  const m = Math.min(Math.round(Math.abs(x) * 32768), 32767);
  let exponent = 0;
  let mantissa: number;
  if (m < 256) {
    mantissa = m >> 4;
  } else {
    exponent = 31 - Math.clz32(m) - 7;
    mantissa = (m >> (exponent + 3)) & 0x0f;
  }
  return (sign | (exponent << 4) | mantissa) ^ 0x55;
}

const DECODE_TABLE = new Float32Array(256);
for (let b = 0; b < 256; b++) DECODE_TABLE[b] = alawDecodeByte(b);

export function decodeAlaw(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = DECODE_TABLE[bytes[i]];
  return out;
}

export function encodeAlaw(samples: Float32Array, outLength: number): Uint8Array {
  const out = new Uint8Array(outLength);
  const n = Math.min(outLength, samples.length);
  for (let i = 0; i < n; i++) out[i] = alawEncodeSample(samples[i]);
  // A-law has no exact zero; 0xD5 is the smallest positive value.
  if (n < outLength) out.fill(0xd5, n);
  return out;
}
