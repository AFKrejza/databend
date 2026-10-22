// Mapping full-res selections onto the preview proxy. See docs/stream-and-selection.md#proxy-coordinates.
import type { Selection } from '../types';
import { todo } from '../todo';

/** Scale `rect` by `scale`, and map `range` proportionally from nFull to nProxy samples. */
export function scaleSelection(selection: Selection, scale: number, nFull: number, nProxy: number): Selection {
  return todo('scaleSelection');
}
