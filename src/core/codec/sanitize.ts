import { todo } from '../todo';

/** NaN → 0, then clamp to [-1, 1). Preserves -0 (needed for the μ-law double zero). */
export function sanitizeSample(x: number): number {
  return todo('sanitizeSample');
}
