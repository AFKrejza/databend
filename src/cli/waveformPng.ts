import { buildPeakCache, computePeaks, type Peaks } from '../core/waveform/peaks';
import type { RasterImage } from '../core/types';
import { writeImage } from './imageIO';

const BG = [20, 20, 22];
const AXIS = [60, 60, 68];
const BEFORE = [138, 138, 148];
const AFTER = [255, 79, 163];

/** Draw before (grey) and after (accent) peaks into an RGBA image and save it as PNG. */
export async function writeWaveformPng(
  path: string, before: Float32Array, after: Float32Array, width = 1600, height = 300,
): Promise<void> {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...BG, 255], i);
  const mid = Math.floor(height / 2);
  for (let x = 0; x < width; x++) data.set([...AXIS, 255], (mid * width + x) * 4);

  const peaks = (s: Float32Array) => computePeaks(s, buildPeakCache(s), 0, s.length, width);
  drawPeaks(data, width, height, peaks(before), BEFORE, 1);
  drawPeaks(data, width, height, peaks(after), AFTER, 0.75);

  const image: RasterImage = { width, height, data };
  await writeImage(path, image, false);
}

function drawPeaks(
  data: Uint8ClampedArray, width: number, height: number, peaks: Peaks, color: number[], alpha: number,
): void {
  const toY = (v: number) => Math.round(((1 - Math.max(-1, Math.min(1, v))) / 2) * (height - 1));
  for (let x = 0; x < width; x++) {
    if (Number.isNaN(peaks.min[x])) continue;
    const y0 = toY(peaks.max[x]);
    const y1 = toY(peaks.min[x]);
    for (let y = y0; y <= y1; y++) {
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = data[o + c] * (1 - alpha) + color[c] * alpha;
    }
  }
}
