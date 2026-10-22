// Waveform view maths. See docs/waveform.md#view-and-navigation.

export interface WaveView {
  /** Sample at the left edge. */
  start: number;
  samplesPerPx: number;
}

/** Most zoomed in: 32 px per sample. */
export const MIN_SAMPLES_PER_PX = 1 / 32;

export function sampleToX(sample: number, view: WaveView): number {
  return (sample - view.start) / view.samplesPerPx;
}

export function xToSample(x: number, view: WaveView): number {
  return view.start + x * view.samplesPerPx;
}

function maxSamplesPerPx(totalSamples: number, widthPx: number): number {
  return Math.max(MIN_SAMPLES_PER_PX, totalSamples / Math.max(1, widthPx));
}

function clampView(view: WaveView, totalSamples: number, widthPx: number): WaveView {
  const spp = Math.min(maxSamplesPerPx(totalSamples, widthPx), Math.max(MIN_SAMPLES_PER_PX, view.samplesPerPx));
  const maxStart = Math.max(0, totalSamples - widthPx * spp);
  return { start: Math.max(0, Math.min(maxStart, view.start)), samplesPerPx: spp };
}

/** Whole stream fits in `widthPx`. */
export function fitAll(totalSamples: number, widthPx: number): WaveView {
  return { start: 0, samplesPerPx: maxSamplesPerPx(totalSamples, widthPx) };
}

export function fitRange(start: number, end: number, widthPx: number, totalSamples: number): WaveView {
  const span = Math.max(1, end - start);
  return clampView({ start, samplesPerPx: span / Math.max(1, widthPx) }, totalSamples, widthPx);
}

/** Zoom by `factor` (< 1 zooms in) keeping the sample under `x` fixed, clamped to the zoom limits. */
export function zoomAround(view: WaveView, x: number, factor: number, totalSamples: number, widthPx: number): WaveView {
  const anchor = xToSample(x, view);
  const spp = Math.min(maxSamplesPerPx(totalSamples, widthPx), Math.max(MIN_SAMPLES_PER_PX, view.samplesPerPx * factor));
  return clampView({ start: anchor - x * spp, samplesPerPx: spp }, totalSamples, widthPx);
}

export function scrollBy(view: WaveView, dx: number, totalSamples: number, widthPx: number): WaveView {
  return clampView({ ...view, start: view.start + dx * view.samplesPerPx }, totalSamples, widthPx);
}

export interface Tick {
  sample: number;
  label: string | null;
  strong: boolean;
}

const STEPS = [1, 2, 5];
const MIN_TICK_PX = 6;
const MIN_LABEL_PX = 60;

/** Smallest of 1, 2, 5, 10, 20, 50, … rows whose ticks are ≥ MIN_TICK_PX apart. */
function tickStep(pxPerRow: number): number {
  for (let mag = 1; ; mag *= 10) {
    for (const s of STEPS) if (s * mag * pxPerRow >= MIN_TICK_PX) return s * mag;
  }
}

/** Row tick marks (every Nth row so they stay ≥ 6 px apart), plus plane boundaries in planar layout. */
export function rowTicks(
  view: WaveView, widthPx: number, rowLength: number, totalSamples: number, planeLength: number | null,
): Tick[] {
  const ticks: Tick[] = [];
  const endSample = Math.min(totalSamples, xToSample(widthPx, view));

  if (rowLength > 0) {
    const pxPerRow = rowLength / view.samplesPerPx;
    const every = tickStep(pxPerRow);
    const labelEvery = every * Math.max(1, Math.ceil(MIN_LABEL_PX / (every * pxPerRow)));
    // Planar planes restart their row count, so tick within each plane.
    const plane = planeLength ?? totalSamples;
    for (let p0 = 0; p0 < totalSamples; p0 += plane) {
      const first = Math.max(1, Math.ceil(Math.max(0, view.start - p0) / (rowLength * every))) * every;
      for (let r = first; p0 + r * rowLength < Math.min(endSample, p0 + plane); r += every) {
        ticks.push({ sample: p0 + r * rowLength, label: r % labelEvery === 0 ? `row ${r}` : null, strong: false });
      }
    }
  }

  if (planeLength) {
    ['R', 'G', 'B'].forEach((name, i) => {
      const s = i * planeLength;
      if (s >= view.start && s <= endSample) ticks.push({ sample: s, label: name, strong: true });
    });
  }
  return ticks.sort((a, b) => a.sample - b.sample);
}
