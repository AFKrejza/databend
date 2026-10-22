// Waveform view maths. See docs/waveform.md#view-and-navigation.
import { todo } from '../todo';

export interface WaveView {
  /** Sample at the left edge. */
  start: number;
  samplesPerPx: number;
}

export const MIN_SAMPLES_PER_PX = 1 / 32;

export function sampleToX(sample: number, view: WaveView): number {
  return (sample - view.start) / view.samplesPerPx;
}

export function xToSample(x: number, view: WaveView): number {
  return view.start + x * view.samplesPerPx;
}

/** Whole stream fits in `widthPx`. */
export function fitAll(totalSamples: number, widthPx: number): WaveView {
  return todo('fitAll');
}

export function fitRange(start: number, end: number, widthPx: number): WaveView {
  return todo('fitRange');
}

/** Zoom by `factor` keeping the sample under `x` fixed, clamped to the zoom limits. */
export function zoomAround(view: WaveView, x: number, factor: number, totalSamples: number, widthPx: number): WaveView {
  return todo('zoomAround');
}

export function scrollBy(view: WaveView, dx: number, totalSamples: number, widthPx: number): WaveView {
  return todo('scrollBy');
}

export interface Tick {
  sample: number;
  label: string | null;
  strong: boolean;
}

/** Row tick marks (every Nth row so they stay ≥ 6 px apart), plus plane boundaries in planar layout. */
export function rowTicks(
  view: WaveView, widthPx: number, rowLength: number, totalSamples: number, planeLength: number | null,
): Tick[] {
  return todo('rowTicks');
}
