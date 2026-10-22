// Transparent canvas over the image: rect, range band, hover crosshair, pointer drags.
// See docs/stream-and-selection.md#selection and docs/waveform.md#linked-cursor.
import { useEffect, useRef } from 'react';
import { baseRegion, pixelSpanToRange, rangeToBands } from '../../core/stream';
import { useStore } from '../state/store';

interface Props {
  /** Full-res image size. */
  width: number;
  height: number;
  /** CSS px per full-res image px. */
  displayScale: number;
  onPan(dx: number, dy: number): void;
}

type Drag =
  | { kind: 'rect'; x0: number; y0: number }
  | { kind: 'range'; x0: number; y0: number }
  | { kind: 'pan'; lastX: number; lastY: number };

export function SelectionOverlay({ width, height, displayScale, onPan }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const selection = useStore((s) => s.selection);
  const settings = useStore((s) => s.settings);
  const tool = useStore((s) => s.view.tool);
  const hover = useStore((s) => s.view.hoverPixel);
  const { setSelection, commitHistory, setView } = useStore.getState();

  const cssW = width * displayScale;
  const cssH = height * displayScale;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr * displayScale, 0, 0, dpr * displayScale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const px = 1 / displayScale; // one CSS pixel, in image units
    const accent = getComputedStyle(canvas).getPropertyValue('--accent').trim() || '#ff4fa3';

    const region = baseRegion(width, height, selection.rect);
    if (selection.rect) {
      // Dim everything outside the rect.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.rect(region.x, region.y, region.w, region.h);
      ctx.fill('evenodd');
      ctx.setLineDash([4 * px, 4 * px]);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = px;
      ctx.strokeRect(region.x, region.y, region.w, region.h);
      ctx.setLineDash([]);
    }
    if (selection.range) {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.3;
      const bands = rangeToBands(selection.range, region, settings);
      for (const b of bands) ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent;
      ctx.lineWidth = px;
      for (const b of bands) ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    if (hover) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = px;
      ctx.beginPath();
      ctx.moveTo(hover.x + 0.5, 0);
      ctx.lineTo(hover.x + 0.5, height);
      ctx.moveTo(0, hover.y + 0.5);
      ctx.lineTo(width, hover.y + 0.5);
      ctx.stroke();
    }
  }, [selection, settings, hover, width, height, displayScale, cssW, cssH]);

  const toPixel = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(width - 1, Math.floor((e.clientX - r.left) / displayScale))),
      y: Math.max(0, Math.min(height - 1, Math.floor((e.clientY - r.top) / displayScale))),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    ref.current!.setPointerCapture(e.pointerId);
    const p = toPixel(e);
    if (tool === 'pan' || e.button === 1) drag.current = { kind: 'pan', lastX: e.clientX, lastY: e.clientY };
    else if (tool === 'rect') drag.current = { kind: 'rect', x0: p.x, y0: p.y };
    else {
      drag.current = { kind: 'range', x0: p.x, y0: p.y };
      setSelection({ rect: null, range: pixelSpanToRange(p, p, width, height, settings) });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toPixel(e);
    setView({ hoverPixel: p });
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      onPan(e.clientX - d.lastX, e.clientY - d.lastY);
      drag.current = { ...d, lastX: e.clientX, lastY: e.clientY };
    } else if (d.kind === 'rect') {
      let w = p.x - d.x0;
      let h = p.y - d.y0;
      if (e.shiftKey) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * side;
        h = Math.sign(h || 1) * side;
      }
      const x = Math.min(d.x0, d.x0 + w);
      const y = Math.min(d.y0, d.y0 + h);
      setSelection({ rect: { x, y, w: Math.abs(w) + 1, h: Math.abs(h) + 1 }, range: null });
    } else {
      setSelection({ rect: null, range: pixelSpanToRange({ x: d.x0, y: d.y0 }, p, width, height, settings) });
    }
  };

  const onPointerUp = () => {
    if (drag.current && drag.current.kind !== 'pan') commitHistory();
    drag.current = null;
  };

  const cursor = tool === 'pan' ? 'grab' : 'crosshair';
  return (
    <canvas
      ref={ref}
      className="overlay"
      style={{ width: cssW, height: cssH, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setView({ hoverPixel: null })}
    />
  );
}
