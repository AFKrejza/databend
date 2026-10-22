// ITU G.711 μ-law, as used by libsndfile/Audacity. See docs/codec.md#μ-law-default-mulawts.
import { todo } from '../todo';

/** Decode one byte. 0x7F decodes to -0 so the round trip is lossless. */
export function mulawDecodeByte(byte: number): number {
  return todo('mulawDecodeByte');
}

/** Encode one sample in [-1, 1). Uses the sign bit, so -0 → 0x7F. */
export function mulawEncodeSample(x: number): number {
  return todo('mulawEncodeSample');
}

export function decodeMulaw(bytes: Uint8Array): Float32Array {
  return todo('decodeMulaw');
}

export function encodeMulaw(samples: Float32Array, outLength: number): Uint8Array {
  return todo('encodeMulaw');
}
