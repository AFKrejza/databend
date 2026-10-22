// Undo/redo snapshots. See docs/render-engine.md#undo--redo.
import type { RasterImage, Selection, Settings } from '../../core/types';
import type { EffectInstance } from '../../core/effects/types';

export interface Snapshot {
  /** Shared by reference unless a bake happened. */
  base: RasterImage;
  proxy: RasterImage | null;
  chain: EffectInstance[];
  settings: Settings;
  selection: Selection;
}

export interface History {
  past: Snapshot[];
  future: Snapshot[];
}

export const EMPTY_HISTORY: History = { past: [], future: [] };

/** Bytes of distinct bases kept before the oldest snapshots are dropped. */
export const HISTORY_MEMORY_LIMIT = 400 * 1024 * 1024;
const MAX_STEPS = 200;

export function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return a.base === b.base && a.chain === b.chain && a.settings === b.settings && a.selection === b.selection;
}

function distinctBaseBytes(snaps: Snapshot[]): number {
  const seen = new Set<RasterImage>();
  let bytes = 0;
  for (const s of snaps) {
    if (seen.has(s.base)) continue;
    seen.add(s.base);
    bytes += s.base.data.byteLength;
  }
  return bytes;
}

/** New past entry; clears the redo stack and trims old entries by count and memory. */
export function pushSnapshot(history: History, snap: Snapshot): History {
  const past = [...history.past, snap];
  while (past.length > MAX_STEPS || (past.length > 1 && distinctBaseBytes(past) > HISTORY_MEMORY_LIMIT)) past.shift();
  return { past, future: [] };
}

export function undo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const snapshot = history.past[history.past.length - 1];
  if (!snapshot) return null;
  return { history: { past: history.past.slice(0, -1), future: [current, ...history.future] }, snapshot };
}

export function redo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const [snapshot, ...future] = history.future;
  if (!snapshot) return null;
  return { history: { past: [...history.past, current], future }, snapshot };
}
