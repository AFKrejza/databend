// Debounced live preview. See docs/render-engine.md#live-preview-web-only-webstate.
import { render, type RenderRequest, type RenderResult } from '../../core/engine/render';
import { OffsetCache } from '../../core/engine/offsetCache';
import type { Platform } from '../../core/platform';

export const DEBOUNCE_MS = 60;
const MAX_DEBOUNCE_MS = 500;

export interface PreviewScheduler {
  /** Call on every change. At most one render runs at a time; the newest request always runs last. */
  request(req: RenderRequest): void;
  /** Drop pending work and ignore the render in flight. */
  cancel(): void;
}

export function createPreviewScheduler(
  platform: Platform,
  onResult: (result: RenderResult, req: RenderRequest) => void,
  onError: (err: unknown) => void,
): PreviewScheduler {
  const cache = new OffsetCache();
  let pending: RenderRequest | null = null;
  let running = false;
  let generation = 0;
  let delay = DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function kick(): Promise<void> {
    if (running || !pending) return;
    const req = pending;
    pending = null;
    running = true;
    const gen = generation;
    try {
      const result = await render(req, platform, cache);
      // Intermediate results are still shown while dragging; only cancel() discards them.
      if (gen === generation) onResult(result, req);
      // Slow renders stretch the debounce so dragging doesn't queue up work.
      delay = Math.min(MAX_DEBOUNCE_MS, Math.max(DEBOUNCE_MS, result.ms > 300 ? result.ms : DEBOUNCE_MS));
    } catch (err) {
      if (gen === generation) onError(err);
    } finally {
      running = false;
      if (pending) void kick();
    }
  }

  return {
    request(req) {
      pending = req;
      clearTimeout(timer);
      timer = setTimeout(() => void kick(), delay);
    },
    cancel() {
      pending = null;
      clearTimeout(timer);
      generation++;
    },
  };
}
