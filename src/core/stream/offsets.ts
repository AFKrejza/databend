// Offset tables: stream position i → byte index in RasterImage.data.
// Stream positions are bytes; with a 16-bit encoding, sample = floor(position / 2).
// See docs/stream-and-selection.md.
import type { Layout, Rect, SampleRange, Selection, Settings } from '../types';

/** Stream bytes per image pixel for a layout. */
export function samplesPerPixel(layout: Layout): number {
  return layout === 'interleaved' ? 3 : 1;
}

/** RGBA channel indices that go into the stream. */
export function streamChannels(layout: Layout): number[] {
  switch (layout) {
    case 'interleaved':
    case 'planar': return [0, 1, 2];
    case 'r': return [0];
    case 'g': return [1];
    case 'b': return [2];
  }
}

/** Clip a rect to the image bounds (rounding to whole pixels). Returns null if nothing is left. */
export function clipRect(rect: Rect, width: number, height: number): Rect | null {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const x1 = Math.min(width, Math.round(rect.x + rect.w));
  const y1 = Math.min(height, Math.round(rect.y + rect.h));
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The region the base stream covers: the clipped rect, or the whole image. */
export function baseRegion(width: number, height: number, rect: Rect | null): Rect {
  const full = { x: 0, y: 0, w: width, h: height };
  return rect ? (clipRect(rect, width, height) ?? { x: 0, y: 0, w: 0, h: 0 }) : full;
}

/** Stream bytes in one scan line of the base stream (whole image, or the rect). */
export function rowLength(width: number, height: number, rect: Rect | null, settings: Settings): number {
  const r = baseRegion(width, height, rect);
  return (settings.scan === 'rows' ? r.w : r.h) * samplesPerPixel(settings.layout);
}

/** Total stream bytes in the base stream. */
export function baseStreamLength(width: number, height: number, rect: Rect | null, settings: Settings): number {
  const r = baseRegion(width, height, rect);
  return r.w * r.h * streamChannels(settings.layout).length;
}

/** Pixel indices (y * width + x) of the region, in scan order. */
function pixelOrder(width: number, r: Rect, scan: Settings['scan']): Uint32Array {
  const out = new Uint32Array(r.w * r.h);
  let k = 0;
  if (scan === 'rows') {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) out[k++] = y * width + x;
    }
  } else {
    for (let x = r.x; x < r.x + r.w; x++) {
      for (let y = r.y; y < r.y + r.h; y++) out[k++] = y * width + x;
    }
  }
  return out;
}

/** Offsets for the base stream: the whole image, or just `rect`, in layout + scan order. */
export function buildBaseOffsets(width: number, height: number, rect: Rect | null, settings: Settings): Uint32Array {
  const pixels = pixelOrder(width, baseRegion(width, height, rect), settings.scan);
  const channels = streamChannels(settings.layout);
  const out = new Uint32Array(pixels.length * channels.length);
  let i = 0;
  if (settings.layout === 'planar') {
    for (const c of channels) {
      for (let k = 0; k < pixels.length; k++) out[i++] = pixels[k] * 4 + c;
    }
  } else {
    for (let k = 0; k < pixels.length; k++) {
      const base = pixels[k] * 4;
      for (const c of channels) out[i++] = base + c;
    }
  }
  return out;
}

/** Clamp a range to [0, length] with start ≤ end. */
export function clampRange(range: SampleRange, length: number): SampleRange {
  const a = Math.max(0, Math.min(length, Math.round(Math.min(range.start, range.end))));
  const b = Math.max(0, Math.min(length, Math.round(Math.max(range.start, range.end))));
  return { start: a, end: b };
}

/** Base offsets narrowed to `selection.range` (a zero-copy subarray). */
export function buildOffsets(width: number, height: number, selection: Selection, settings: Settings): Uint32Array {
  const base = buildBaseOffsets(width, height, selection.rect, settings);
  if (!selection.range) return base;
  const { start, end } = clampRange(selection.range, base.length);
  return base.subarray(start, end);
}

/** Index of a pixel in the region's scan order, or -1 if outside. */
function scanIndex(x: number, y: number, r: Rect, scan: Settings['scan']): number {
  if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return -1;
  return scan === 'rows' ? (y - r.y) * r.w + (x - r.x) : (x - r.x) * r.h + (y - r.y);
}

/** Inverse of the offset table: the base-stream positions for one pixel (empty if outside). */
export function pixelToSamples(
  x: number, y: number, width: number, height: number, rect: Rect | null, settings: Settings,
): number[] {
  const r = baseRegion(width, height, rect);
  const k = scanIndex(x, y, r, settings.scan);
  if (k < 0) return [];
  switch (settings.layout) {
    case 'interleaved': return [3 * k, 3 * k + 1, 3 * k + 2];
    case 'planar': {
      const n = r.w * r.h;
      return [k, n + k, 2 * n + k];
    }
    default: return [k];
  }
}

export interface PixelRef {
  x: number;
  y: number;
  channel: 0 | 1 | 2 | 3;
}

/** Byte offset in RasterImage.data → pixel and channel. */
export function offsetToPixel(offset: number, width: number): PixelRef {
  const p = offset >> 2;
  return { x: p % width, y: Math.floor(p / width), channel: (offset & 3) as PixelRef['channel'] };
}

/**
 * Range tool: pixel A..B on the image → range in the full-image stream, from the first byte of
 * the earlier pixel to the last byte of the later one. In planar layout this covers the R plane.
 */
export function pixelSpanToRange(
  a: { x: number; y: number }, b: { x: number; y: number }, width: number, height: number, settings: Settings,
): SampleRange {
  const r = { x: 0, y: 0, w: width, h: height };
  const clampPx = (p: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(width - 1, Math.floor(p.x))),
    y: Math.max(0, Math.min(height - 1, Math.floor(p.y))),
  });
  const ka = scanIndex(clampPx(a).x, clampPx(a).y, r, settings.scan);
  const kb = scanIndex(clampPx(b).x, clampPx(b).y, r, settings.scan);
  const lo = Math.min(ka, kb);
  const hi = Math.max(ka, kb);
  const spp = samplesPerPixel(settings.layout);
  return { start: lo * spp, end: (hi + 1) * spp };
}
