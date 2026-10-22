// Min/max peaks per screen column. See docs/waveform.md#drawing-it-fast-srccorewaveformpeaksts.
import { todo } from '../todo';

export const PEAK_BLOCK = 256;

/** Min/max of every PEAK_BLOCK samples, computed once per render. */
export interface PeakCache {
  block: number;
  min: Float32Array;
  max: Float32Array;
}

export interface Peaks {
  min: Float32Array;
  max: Float32Array;
}

export function buildPeakCache(samples: Float32Array, block = PEAK_BLOCK): PeakCache {
  return todo('buildPeakCache');
}

/** Peaks for samples [from, to) across `columns`. Uses the cache when ≥ block samples per column. */
export function computePeaks(
  samples: Float32Array, cache: PeakCache | null, from: number, to: number, columns: number,
): Peaks {
  return todo('computePeaks');
}
