import type { EffectContext } from '../src/core/effects/types';
import type { RasterImage } from '../src/core/types';

export function ctx(overrides: Partial<EffectContext> = {}): EffectContext {
  return { sampleRate: 44100, samplesPerPixel: 3, rowLength: 300, scale: 1, seed: 1, ...overrides };
}

/** Deterministic test image with varied bytes and opaque alpha. */
export function makeImage(width: number, height: number): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i & 3) === 3 ? 255 : (i * 37 + (i >> 5)) & 0xff;
  return { width, height, data };
}

export function noise(n: number, seed = 1): Float32Array {
  let s = seed;
  return Float32Array.from({ length: n }, () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647) * 2 - 1;
  });
}
