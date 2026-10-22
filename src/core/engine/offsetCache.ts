import type { Selection, Settings } from '../types';
import { buildOffsets } from '../stream/offsets';

/**
 * Remembers the last offset table, keyed by (width, height, selection, layout, scan),
 * so slider changes don't rebuild it.
 */
export class OffsetCache {
  private key = '';
  private offsets: Uint32Array | null = null;

  get(width: number, height: number, selection: Selection, settings: Settings): Uint32Array {
    const key = JSON.stringify([width, height, selection.rect, selection.range, settings.layout, settings.scan]);
    if (key !== this.key || !this.offsets) {
      this.offsets = buildOffsets(width, height, selection, settings);
      this.key = key;
    }
    return this.offsets;
  }

  clear(): void {
    this.key = '';
    this.offsets = null;
  }
}
