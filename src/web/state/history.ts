// Undo/redo snapshots. See docs/render-engine.md#undo--redo.
import type { RasterImage, Selection, Settings } from '../../core/types';
import type { EffectInstance } from '../../core/effects/types';
import { todo } from '../../core/todo';

export interface Snapshot {
  /** Shared by reference unless a bake happened. */
  base: RasterImage;
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

export function pushSnapshot(history: History, snap: Snapshot): History {
  return todo('pushSnapshot');
}

export function undo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  return todo('undo');
}

export function redo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  return todo('redo');
}
