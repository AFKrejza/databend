// Debounced live preview with generation-based cancellation. See docs/render-engine.md#live-preview-web-only-webstate.
import type { RenderRequest, RenderResult } from '../../core/engine/render';
import { todo } from '../../core/todo';

export const DEBOUNCE_MS = 60;

export interface PreviewScheduler {
  /** Call on every change. Only the newest request's result is delivered. */
  request(req: RenderRequest): void;
  cancel(): void;
}

export function createPreviewScheduler(
  onResult: (result: RenderResult) => void,
  onError: (err: unknown) => void,
): PreviewScheduler {
  return todo('createPreviewScheduler');
}
