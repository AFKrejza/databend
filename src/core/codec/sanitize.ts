/** Largest sample below 1 that every encoding can represent. */
export const MAX_SAMPLE = 32767 / 32768;

/** NaN → 0, then clamp to [-1, MAX_SAMPLE]. Preserves -0 (needed for the μ-law double zero). */
export function sanitizeSample(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x > MAX_SAMPLE) return MAX_SAMPLE;
  if (x < -1) return -1;
  return x;
}

/** True for negative numbers and -0. */
export function isNegative(x: number): boolean {
  return x < 0 || Object.is(x, -0);
}
