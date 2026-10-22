import { describe, expect, it } from 'vitest';
import {
  baseStreamLength, buildBaseOffsets, buildOffsets, extract, insert, offsetToPixel,
  pixelSpanToRange, pixelToSamples, rowLength, scaleSelection,
} from '../src/core/stream';
import { LAYOUTS, SCANS, type RasterImage, type Rect, type Selection, type Settings } from '../src/core/types';

const W = 7;
const H = 5;

function testImage(): RasterImage {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 37) & 0xff;
  return { width: W, height: H, data };
}

const RECTS: (Rect | null)[] = [null, { x: 1, y: 1, w: 4, h: 3 }, { x: 5, y: 3, w: 10, h: 10 }];
const ALL_SETTINGS: Settings[] = LAYOUTS.flatMap((layout) =>
  SCANS.map((scan) => ({ encoding: 'mulaw' as const, layout, scan })));

describe('stream', () => {
  it('insert(extract()) is identity for every layout × scan × selection', () => {
    for (const s of ALL_SETTINGS) {
      for (const rect of RECTS) {
        for (const range of [null, { start: 2, end: 9 }]) {
          const img = testImage();
          const before = img.data.slice();
          const offsets = buildOffsets(W, H, { rect, range }, s);
          insert(img.data, offsets, extract(img.data, offsets));
          expect(img.data).toEqual(before);
        }
      }
    }
  });

  it('offsets are unique and never point at alpha', () => {
    for (const s of ALL_SETTINGS) {
      for (const rect of RECTS) {
        const offsets = buildBaseOffsets(W, H, rect, s);
        expect(new Set(offsets).size).toBe(offsets.length);
        for (const o of offsets) expect(o & 3).not.toBe(3);
      }
    }
  });

  it('rect offsets cover exactly the rect pixels × channels', () => {
    const rect = { x: 1, y: 1, w: 4, h: 3 };
    for (const s of ALL_SETTINGS) {
      const offsets = buildBaseOffsets(W, H, rect, s);
      expect(offsets.length).toBe(baseStreamLength(W, H, rect, s));
      for (const o of offsets) {
        const p = offsetToPixel(o, W);
        expect(p.x >= 1 && p.x < 5 && p.y >= 1 && p.y < 4).toBe(true);
      }
    }
  });

  it('rect is clipped to the image', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'r', scan: 'rows' };
    expect(buildBaseOffsets(W, H, { x: 5, y: 3, w: 10, h: 10 }, s).length).toBe(2 * 2);
    expect(buildBaseOffsets(W, H, { x: 50, y: 0, w: 1, h: 1 }, s).length).toBe(0);
  });

  it('interleaved rows scan is plain RGB order', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'interleaved', scan: 'rows' };
    expect(Array.from(buildBaseOffsets(W, H, null, s).subarray(0, 7))).toEqual([0, 1, 2, 4, 5, 6, 8]);
  });

  it('planar puts all R, then all G, then all B', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'planar', scan: 'rows' };
    const offsets = buildBaseOffsets(W, H, null, s);
    const n = W * H;
    expect(offsets[0]).toBe(0);
    expect(offsets[n]).toBe(1);
    expect(offsets[2 * n]).toBe(2);
  });

  it('columns scan goes down first', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'r', scan: 'columns' };
    expect(Array.from(buildBaseOffsets(W, H, null, s).subarray(0, 2))).toEqual([0, W * 4]);
  });

  it('range narrows the base stream', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'interleaved', scan: 'rows' };
    const sel: Selection = { rect: null, range: { start: 3, end: 9 } };
    const base = buildBaseOffsets(W, H, null, s);
    expect(Array.from(buildOffsets(W, H, sel, s))).toEqual(Array.from(base.subarray(3, 9)));
    expect(buildOffsets(W, H, { rect: null, range: { start: -5, end: 1e9 } }, s).length).toBe(base.length);
  });

  it('pixelToSamples inverts the offset table', () => {
    for (const s of ALL_SETTINGS) {
      for (const rect of RECTS) {
        const offsets = buildBaseOffsets(W, H, rect, s);
        offsets.forEach((o, i) => {
          const p = offsetToPixel(o, W);
          expect(pixelToSamples(p.x, p.y, W, H, rect, s)).toContain(i);
        });
      }
    }
    const s = ALL_SETTINGS[0];
    expect(pixelToSamples(0, 0, W, H, { x: 2, y: 2, w: 1, h: 1 }, s)).toEqual([]);
  });

  it('pixelSpanToRange covers first byte of A to last byte of B', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'interleaved', scan: 'rows' };
    expect(pixelSpanToRange({ x: 2, y: 1 }, { x: 0, y: 0 }, W, H, s)).toEqual({ start: 0, end: (W + 3) * 3 });
  });

  it('rowLength matches the scan direction', () => {
    const s: Settings = { encoding: 'mulaw', layout: 'interleaved', scan: 'rows' };
    expect(rowLength(W, H, null, s)).toBe(W * 3);
    expect(rowLength(W, H, null, { ...s, scan: 'columns' })).toBe(H * 3);
    expect(rowLength(W, H, { x: 0, y: 0, w: 2, h: 2 }, { ...s, layout: 'planar' })).toBe(2);
  });

  it('scaleSelection maps rect and range onto the proxy', () => {
    const sel: Selection = { rect: { x: 100, y: 50, w: 200, h: 100 }, range: { start: 1000, end: 3000 } };
    expect(scaleSelection(sel, 0.5, 4000, 1000)).toEqual({
      rect: { x: 50, y: 25, w: 100, h: 50 },
      range: { start: 250, end: 750 },
    });
  });
});
