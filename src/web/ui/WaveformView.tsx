// Bottom waveform panel. See docs/waveform.md.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildPeakCache, computePeaks, type PeakCache } from '../../core/waveform/peaks';
import {
  fitAll, fitRange, rowTicks, sampleToX, scrollBy, xToSample, zoomAround, type WaveView,
} from '../../core/waveform/view';
import { offsetToPixel, samplesPerPixel } from '../../core/stream';
import { useStore } from '../state/store';
import { toFullPosition, toRenderPosition, wavePositionsForPixel, type WaveData } from '../state/waveData';

const MINIMAP_H = 10;

export function WaveformView() {
  const wave = useStore((s) => s.render.wave);
  const selection = useStore((s) => s.selection);
  const hover = useStore((s) => s.view.hoverPixel);
  const stacked = useStore((s) => s.view.waveStacked);
  const { setSelection, commitHistory, setView } = useStore.getState();

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 120 });
  const [view, setWaveView] = useState<WaveView>({ start: 0, samplesPerPx: 1 });
  const drag = useRef<{ kind: 'select'; anchor: number } | { kind: 'minimap' } | null>(null);

  const total = wave?.before.length ?? 0;
  const caches = useMemo(
    () => (wave ? { before: buildPeakCache(wave.before), after: buildPeakCache(wave.after) } : null),
    [wave],
  );

  // The canvas box only exists once there's a wave, so re-attach when it appears.
  const hasWave = wave !== null;
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasWave]);

  // When the stream length changes (proxy → full res, new rect, layout…) keep the same relative view;
  // a fully zoomed-out view stays fully zoomed out.
  const prevTotal = useRef(0);
  useEffect(() => {
    const prev = prevTotal.current;
    prevTotal.current = total;
    setWaveView((v) => {
      if (prev === 0 || total === 0) return fitAll(total, size.w);
      const k = total / prev;
      return scrollBy({ start: v.start * k, samplesPerPx: v.samplesPerPx * k }, 0, total, size.w);
    });
  }, [total, size.w]);

  // Selected range and hover playheads, in render-resolution samples.
  const rangeSamples = wave && selection.range
    ? [toRenderPosition(selection.range.start, wave) / wave.bytesPerSample,
       toRenderPosition(selection.range.end, wave) / wave.bytesPerSample]
    : null;
  const playheads = wave && hover ? hoverToSamples(hover, wave) : [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wave || !caches) return;
    draw(canvas, size, view, wave, caches, stacked, rangeSamples, playheads);
  });

  // Wheel: ctrl zooms around the cursor, otherwise scroll. Non-passive so the page doesn't scroll.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const x = e.offsetX;
      setWaveView((v) => e.ctrlKey
        ? zoomAround(v, x, Math.exp(e.deltaY * 0.002), total, size.w)
        : scrollBy(v, e.deltaX + e.deltaY, total, size.w));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [total, size.w, hasWave]);

  if (!wave) {
    return (
      <footer className="waveform">
        <p className="placeholder">The waveform of the pixel stream appears here after import.</p>
      </footer>
    );
  }

  const spp = samplesPerPixel(wave.settings.layout) / wave.bytesPerSample;
  /** Waveform x → sample, snapped to whole pixels unless Alt is held. */
  const sampleAt = (e: React.PointerEvent, snap: boolean) => {
    const s = Math.max(0, Math.min(total, xToSample(e.nativeEvent.offsetX, view)));
    return snap && spp >= 1 ? Math.round(s / spp) * spp : Math.round(s);
  };
  const toFullRange = (a: number, b: number) => ({
    start: toFullPosition(Math.min(a, b) * wave.bytesPerSample, wave),
    end: toFullPosition(Math.max(a, b) * wave.bytesPerSample, wave),
  });
  /** Minimap click: centre the view on that point of the stream. */
  const jumpTo = (x: number) => {
    const center = (x / size.w) * total;
    setWaveView((v) => scrollBy({ ...v, start: center - (size.w * v.samplesPerPx) / 2 }, 0, total, size.w));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId);
    if (e.nativeEvent.offsetY < MINIMAP_H) {
      drag.current = { kind: 'minimap' };
      jumpTo(e.nativeEvent.offsetX);
      return;
    }
    const s = sampleAt(e, !e.altKey);
    const anchor = e.shiftKey && rangeSamples
      ? (Math.abs(s - rangeSamples[0]) > Math.abs(s - rangeSamples[1]) ? rangeSamples[0] : rangeSamples[1])
      : s;
    drag.current = { kind: 'select', anchor };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d?.kind === 'minimap') return jumpTo(e.nativeEvent.offsetX);
    if (d?.kind === 'select') {
      const s = sampleAt(e, !e.altKey);
      if (s !== d.anchor) setSelection({ rect: selection.rect, range: toFullRange(d.anchor, s) });
    }
    // Linked cursor: sample → pixel.
    const i = Math.floor(xToSample(e.nativeEvent.offsetX, view)) * wave.bytesPerSample;
    if (i >= 0 && i < wave.offsets.length) {
      const p = offsetToPixel(wave.offsets[i], wave.width);
      setView({ hoverPixel: { x: Math.floor(p.x / wave.scale), y: Math.floor(p.y / wave.scale) } });
    }
  };

  const onPointerUp = () => {
    if (drag.current?.kind === 'select') commitHistory();
    drag.current = null;
  };

  return (
    <footer className="waveform">
      <div className="waveform-toolbar">
        <button onClick={() => setWaveView(fitAll(total, size.w))}>Fit</button>
        <button
          disabled={!rangeSamples}
          onClick={() => rangeSamples && setWaveView(fitRange(rangeSamples[0], rangeSamples[1], size.w, total))}
        >
          Zoom to selection
        </button>
        <button onClick={() => setWaveView((v) => zoomAround(v, size.w / 2, 2, total, size.w))}>−</button>
        <button onClick={() => setWaveView((v) => zoomAround(v, size.w / 2, 0.5, total, size.w))}>+</button>
        <button aria-pressed={stacked} onClick={() => setView({ waveStacked: !stacked })}>
          {stacked ? 'Stacked' : 'Overlay'}
        </button>
        <span className="muted">
          {total.toLocaleString()} samples{wave.scale < 1 ? ' (preview)' : ''} · grey = before, pink = after
        </span>
      </div>
      <div className="waveform-canvas" ref={boxRef}>
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setView({ hoverPixel: null })}
          onDoubleClick={() => { setSelection({ rect: selection.rect, range: null }); commitHistory(); }}
        />
      </div>
    </footer>
  );
}

/** Full-res hover pixel → render-resolution sample indices (one per plane in planar layout). */
function hoverToSamples(hover: { x: number; y: number }, wave: WaveData): number[] {
  const positions = wavePositionsForPixel(wave, hover.x, hover.y);
  // Interleaved: one playhead per pixel is enough.
  const shown = wave.settings.layout === 'interleaved' ? positions.slice(0, 1) : positions;
  return shown.map((p) => p / wave.bytesPerSample);
}

function draw(
  canvas: HTMLCanvasElement, size: { w: number; h: number }, view: WaveView, wave: WaveData,
  caches: { before: PeakCache; after: PeakCache }, stacked: boolean,
  range: number[] | null, playheads: number[],
): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(canvas);
  const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const accent = color('--accent', '#ff4fa3');
  const muted = color('--muted', '#8a8a94');
  const border = color('--border', '#2c2c32');

  const total = wave.before.length;
  const W = size.w;
  const top = MINIMAP_H + 2;
  const H = size.h - top;
  ctx.clearRect(0, 0, W, size.h);

  // Minimap: whole stream, with the visible window.
  ctx.fillStyle = border;
  ctx.fillRect(0, 0, W, MINIMAP_H);
  ctx.fillStyle = muted;
  ctx.globalAlpha = 0.6;
  ctx.fillRect((view.start / total) * W, 0, Math.max(2, ((W * view.samplesPerPx) / total) * W), MINIMAP_H);
  ctx.globalAlpha = 1;

  // Selection.
  if (range) {
    const x0 = sampleToX(range[0], view);
    const x1 = sampleToX(range[1], view);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x0, top, x1 - x0, H);
    ctx.globalAlpha = 1;
  }

  // Row ticks and plane boundaries.
  ctx.font = '10px system-ui, sans-serif';
  for (const t of rowTicks(view, W, wave.rowLength, total, wave.planeLength)) {
    const x = Math.round(sampleToX(t.sample, view)) + 0.5;
    ctx.strokeStyle = t.strong ? muted : border;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + H);
    ctx.stroke();
    if (t.label) {
      ctx.fillStyle = muted;
      ctx.fillText(t.label, x + 3, top + 11);
    }
  }

  const lanes = stacked
    ? [{ y: top, h: H / 2, data: [['before', muted, 1]] }, { y: top + H / 2, h: H / 2, data: [['after', accent, 1]] }]
    : [{ y: top, h: H, data: [['before', muted, 1], ['after', accent, 0.75]] }];
  const end = Math.min(total, xToSample(W, view));
  const columns = Math.max(1, Math.ceil(sampleToX(end, view)));

  for (const lane of lanes) {
    const mid = lane.y + lane.h / 2;
    const amp = lane.h / 2 - 2;
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(0, mid + 0.5);
    ctx.lineTo(W, mid + 0.5);
    ctx.stroke();

    for (const [key, c, alpha] of lane.data as [keyof typeof caches, string, number][]) {
      const samples = wave[key];
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      if (view.samplesPerPx >= 0.5) {
        const peaks = computePeaks(samples, caches[key], Math.floor(view.start), Math.ceil(end), columns);
        ctx.beginPath();
        for (let x = 0; x < columns; x++) {
          if (Number.isNaN(peaks.min[x])) continue;
          ctx.moveTo(x + 0.5, mid - peaks.max[x] * amp);
          ctx.lineTo(x + 0.5, mid - peaks.min[x] * amp + 1);
        }
        ctx.stroke();
      } else {
        // Zoomed in: a line through the samples, with dots once they're far apart.
        ctx.beginPath();
        for (let i = Math.floor(view.start); i <= Math.ceil(end) && i < total; i++) {
          const x = sampleToX(i + 0.5, view);
          const y = mid - samples[i] * amp;
          if (i === Math.floor(view.start)) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          if (1 / view.samplesPerPx >= 8) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Playheads for the pixel under the cursor (on the image or here).
  ctx.strokeStyle = '#fff';
  for (const s of playheads) {
    const x = sampleToX(s, view);
    if (x < 0 || x > W) continue;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, top);
    ctx.lineTo(x + 0.5, top + H);
    ctx.stroke();
  }
}
