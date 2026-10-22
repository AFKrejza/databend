// Offset tables: stream sample i → byte index in RasterImage.data.
// See docs/stream-and-selection.md.
import type { Layout, Rect, SampleRange, Selection, Settings } from '../types';
import { todo } from '../todo';

/** Stream samples per image pixel for a layout (before 16-bit pairing). */
export function samplesPerPixel(layout: Layout): number {
  return layout === 'interleaved' ? 3 : 1;
}

/** Samples in one scan line of the base stream (whole image, or the rect). */
export function rowLength(width: number, height: number, rect: Rect | null, settings: Settings): number {
  return todo('rowLength');
}

/** Clip a rect to the image bounds. Returns null if nothing is left. */
export function clipRect(rect: Rect, width: number, height: number): Rect | null {
  return todo('clipRect');
}

/** Offsets for the base stream: the whole image, or just `rect`, in layout + scan order. */
export function buildBaseOffsets(width: number, height: number, rect: Rect | null, settings: Settings): Uint32Array {
  return todo('buildBaseOffsets');
}

/** Base offsets narrowed to `selection.range` (a zero-copy subarray). */
export function buildOffsets(width: number, height: number, selection: Selection, settings: Settings): Uint32Array {
  return todo('buildOffsets');
}

/** Inverse of the offset table: the stream sample indices for one pixel (empty if outside). */
export function pixelToSamples(
  x: number, y: number, width: number, height: number, rect: Rect | null, settings: Settings,
): number[] {
  return todo('pixelToSamples');
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

/** Range tool: pixel A..B on the image → sample range in the full-image stream. */
export function pixelSpanToRange(
  a: { x: number; y: number }, b: { x: number; y: number }, width: number, height: number, settings: Settings,
): SampleRange {
  return todo('pixelSpanToRange');
}
