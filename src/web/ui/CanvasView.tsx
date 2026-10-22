// Draws the output (or base while Before is held). Zoom/pan. See docs/ui.md#interactions.
import { useRef } from 'react';
import { useStore } from '../state/store';
import { SelectionOverlay } from './SelectionOverlay';

export function CanvasView() {
  const image = useStore((s) => s.image);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // TODO: useEffect → putImageData(toImageData(showBefore ? base : output)); fit-to-view; wheel zoom; pan
  return (
    <main className="canvas-view">
      {image ? (
        <div className="canvas-stack">
          <canvas ref={canvasRef} />
          <SelectionOverlay />
        </div>
      ) : (
        <p className="placeholder">Drop an image here, or use Import.</p>
      )}
    </main>
  );
}
