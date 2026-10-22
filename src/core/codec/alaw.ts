// ITU G.711 A-law. See docs/codec.md#a-law-alawts.
import { todo } from '../todo';

export function alawDecodeByte(byte: number): number {
  return todo('alawDecodeByte');
}

export function alawEncodeSample(x: number): number {
  return todo('alawEncodeSample');
}

export function decodeAlaw(bytes: Uint8Array): Float32Array {
  return todo('decodeAlaw');
}

export function encodeAlaw(samples: Float32Array, outLength: number): Uint8Array {
  return todo('encodeAlaw');
}
