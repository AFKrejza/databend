// Draws the output (or the render source while Before is held). Zoom/pan. See docs/ui.md#interactions.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { toImageData } from '../imageIO';
import { SelectionOverlay } from './SelectionOverlay';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 32;

export function CanvasView() {
  const image = useStore((s) => s.image);
  const output = useStore((s) => s.render.output);
  const source = useStore((s) => s.render.source);
  const showBefore = useStore((s) => s.view.showBefore);
  const zoom = useStore((s) => s.view.zoom);
  const setView = useStore((s) => s.setView);

  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });

  // Track the container size to fit the image.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = showBefore ? (source ?? image?.proxy ?? image?.base) : (output ?? image?.proxy ?? image?.base);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shown) return;
    canvas.width = shown.width;
    canvas.height = shown.height;
    canvas.getContext('2d')!.putImageData(toImageData(shown), 0, 0);
  }, [shown]);

  // Ctrl+wheel zooms (needs a non-passive listener to stop the browser zooming the page).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const z = useStore.getState().view.zoom;
      setView({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-e.deltaY * 0.002))) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setView]);

  if (!image) {
    return (
      <main className="canvas-view" ref={containerRef}>
        <p className="placeholder">Drop an image here, paste one, or use Import.</p>
      </main>
    );
  }

  const W = image.base.width;
  const H = image.base.height;
  const fit = Math.min((box.w - 32) / W, (box.h - 32) / H);
  const displayScale = Math.max(0.01, fit * zoom);
  const cssW = W * displayScale;
  const cssH = H * displayScale;
  const pixelated = shown ? cssW / shown.width >= 2 : false;

  const pan = (dx: number, dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft -= dx;
    el.scrollTop -= dy;
  };

  return (
    <main className="canvas-view" ref={containerRef}>
      <div className="canvas-stack" style={{ width: cssW, height: cssH }}>
        <canvas
          ref={canvasRef}
          style={{ width: cssW, height: cssH, imageRendering: pixelated ? 'pixelated' : 'auto' }}
        />
        <SelectionOverlay width={W} height={H} displayScale={displayScale} onPan={pan} />
      </div>
      <div className="zoom-badge">
        <button onClick={() => setView({ zoom: 1 })} title="Fit to view">{Math.round(displayScale * 100)}%</button>
      </div>
    </main>
  );
}
