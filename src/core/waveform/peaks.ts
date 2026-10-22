// Min/max peaks per screen column. See docs/waveform.md#drawing-it-fast-srccorewaveformpeaksts.

export const PEAK_BLOCK = 256;

/** Min/max of every PEAK_BLOCK samples, computed once per render. */
export interface PeakCache {
  block: number;
  min: Float32Array;
  max: Float32Array;
}

/** Per-column min/max. Columns with no samples hold NaN. */
export interface Peaks {
  min: Float32Array;
  max: Float32Array;
}

export function buildPeakCache(samples: Float32Array, block = PEAK_BLOCK): PeakCache {
  const n = Math.ceil(samples.length / block);
  const min = new Float32Array(n);
  const max = new Float32Array(n);
  for (let b = 0; b < n; b++) {
    let lo = Infinity;
    let hi = -Infinity;
    const end = Math.min(samples.length, (b + 1) * block);
    for (let i = b * block; i < end; i++) {
      const v = samples[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[b] = lo;
    max[b] = hi;
  }
  return { block, min, max };
}

/** Peaks for samples [from, to) across `columns`. Uses the cache for whole blocks inside a column. */
export function computePeaks(
  samples: Float32Array, cache: PeakCache | null, from: number, to: number, columns: number,
): Peaks {
  const min = new Float32Array(columns).fill(NaN);
  const max = new Float32Array(columns).fill(NaN);
  from = Math.max(0, from);
  to = Math.min(samples.length, to);
  if (to <= from || columns <= 0) return { min, max };
  const perCol = (to - from) / columns;

  for (let c = 0; c < columns; c++) {
    const a = from + Math.floor(c * perCol);
    const b = Math.min(to, Math.max(a + 1, from + Math.floor((c + 1) * perCol)));
    if (a >= to) break;
    let lo = Infinity;
    let hi = -Infinity;
    const raw = (i0: number, i1: number) => {
      for (let i = i0; i < i1; i++) {
        const v = samples[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    };
    if (cache && b - a >= cache.block) {
      const B = cache.block;
      const b0 = Math.ceil(a / B);
      const b1 = Math.floor(b / B);
      raw(a, Math.min(b, b0 * B));
      for (let k = b0; k < b1; k++) {
        if (cache.min[k] < lo) lo = cache.min[k];
        if (cache.max[k] > hi) hi = cache.max[k];
      }
      raw(Math.max(a, b1 * B), b);
    } else {
      raw(a, b);
    }
    min[c] = lo;
    max[c] = hi;
  }
  return { min, max };
}
