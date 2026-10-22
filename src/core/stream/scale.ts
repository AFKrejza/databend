// Mapping full-res selections onto the preview proxy. See docs/stream-and-selection.md#proxy-coordinates.
import type { Selection } from '../types';

/** Scale `rect` by `scale`, and map `range` proportionally from nFull to nProxy stream bytes. */
export function scaleSelection(selection: Selection, scale: number, nFull: number, nProxy: number): Selection {
  if (scale === 1) return selection;
  const { rect, range } = selection;
  const ratio = nFull > 0 ? nProxy / nFull : 0;
  return {
    rect: rect && { x: rect.x * scale, y: rect.y * scale, w: rect.w * scale, h: rect.h * scale },
    range: range && { start: Math.round(range.start * ratio), end: Math.round(range.end * ratio) },
  };
}
