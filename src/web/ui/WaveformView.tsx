// Bottom waveform panel. See docs/waveform.md.
import { useRef } from 'react';
import { useStore } from '../state/store';

export function WaveformView() {
  const before = useStore((s) => s.render.before);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // TODO: WaveView state; buildPeakCache on new render; draw before/after (overlay | stacked),
  //       row ticks, selection, playhead; wheel zoom/scroll; drag → setSelection({range}); minimap
  return (
    <footer className="waveform">
      <div className="waveform-toolbar">
        <button disabled>Fit</button>
        <button disabled>Zoom to selection</button>
        <button disabled>−</button>
        <button disabled>+</button>
        <button disabled>Overlay / Stacked</button>
      </div>
      {before ? <canvas ref={canvasRef} /> : <p className="placeholder">Waveform appears after import.</p>}
    </footer>
  );
}
