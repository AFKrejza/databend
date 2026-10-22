import { describe, expect, it } from 'vitest';
import { buildPeakCache, computePeaks } from '../src/core/waveform/peaks';
import { fitAll, rowTicks, sampleToX, scrollBy, xToSample, zoomAround } from '../src/core/waveform/view';
import { noise } from './helpers';

function bruteForce(x: Float32Array, from: number, to: number, columns: number) {
  const perCol = (to - from) / columns;
  return Array.from({ length: columns }, (_, c) => {
    const a = from + Math.floor(c * perCol);
    const b = Math.min(to, Math.max(a + 1, from + Math.floor((c + 1) * perCol)));
    const slice = Array.from(x.subarray(a, b));
    return [Math.min(...slice), Math.max(...slice)];
  });
}

describe('waveform peaks', () => {
  it('computePeaks matches brute force (cached and raw paths)', () => {
    const x = noise(50_000);
    const cache = buildPeakCache(x);
    for (const [from, to, cols] of [[0, 50_000, 37], [1234, 40_001, 100], [100, 900, 50]]) {
      const expected = bruteForce(x, from, to, cols);
      for (const c of [cache, null]) {
        const p = computePeaks(x, c, from, to, cols);
        expected.forEach(([lo, hi], i) => {
          expect(p.min[i]).toBe(Math.fround(lo));
          expect(p.max[i]).toBe(Math.fround(hi));
        });
      }
    }
  });

  it('handles from == to and fewer samples than columns', () => {
    const x = noise(10);
    expect(Array.from(computePeaks(x, null, 5, 5, 4).min).every(Number.isNaN)).toBe(true);
    // 3 samples over 10 columns: each column shows the sample it falls on.
    const p = computePeaks(x, null, 0, 3, 10);
    expect(p.min[0]).toBe(x[0]);
    expect(p.max[9]).toBe(x[2]);
  });
});

describe('waveform view', () => {
  it('sampleToX / xToSample round-trip', () => {
    const v = { start: 100, samplesPerPx: 2.5 };
    expect(xToSample(sampleToX(1234, v), v)).toBeCloseTo(1234);
  });

  it('fitAll shows the whole stream', () => {
    expect(fitAll(10_000, 1000)).toEqual({ start: 0, samplesPerPx: 10 });
  });

  it('zoomAround keeps the sample under the cursor fixed', () => {
    const v = fitAll(100_000, 1000);
    const anchor = xToSample(300, v);
    const z = zoomAround(v, 300, 0.25, 100_000, 1000);
    expect(z.samplesPerPx).toBe(25);
    expect(xToSample(300, z)).toBeCloseTo(anchor);
  });

  it('zoom and scroll are clamped', () => {
    const v = fitAll(1000, 100);
    expect(zoomAround(v, 0, 10, 1000, 100)).toEqual(v);
    expect(zoomAround(v, 0, 1e-9, 1000, 100).samplesPerPx).toBe(1 / 32);
    expect(scrollBy(v, 500, 1000, 100).start).toBe(0);
  });

  it('rowTicks thins out dense ticks and labels some', () => {
    const view = fitAll(300 * 1000, 1000); // 1000 rows of 300 samples in 1000 px
    const ticks = rowTicks(view, 1000, 300, 300_000, null);
    const gaps = ticks.slice(1).map((t, i) => (t.sample - ticks[i].sample) / view.samplesPerPx);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(6);
    expect(ticks.some((t) => t.label?.startsWith('row'))).toBe(true);
  });

  it('rowTicks marks planar plane boundaries', () => {
    const ticks = rowTicks(fitAll(300, 300), 300, 10, 300, 100);
    expect(ticks.filter((t) => t.strong).map((t) => t.label)).toEqual(['R', 'G', 'B']);
  });
});
