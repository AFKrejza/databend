import type { Selection, Settings } from '../types';
import { todo } from '../todo';

/**
 * Remembers the last offset table, keyed by (width, height, selection, layout, scan),
 * so slider changes don't rebuild it.
 */
export class OffsetCache {
  get(width: number, height: number, selection: Selection, settings: Settings): Uint32Array {
    return todo('OffsetCache.get');
  }

  clear(): void {
    todo('OffsetCache.clear');
  }
}
