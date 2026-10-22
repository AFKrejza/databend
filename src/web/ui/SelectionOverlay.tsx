// Transparent canvas over the image: rect, range band, hover crosshair, pointer drags.
// See docs/stream-and-selection.md#selection and docs/waveform.md#linked-cursor.
import { useRef } from 'react';

export function SelectionOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  // TODO: pointer handlers per tool (rect → setSelection({rect}), range → pixelSpanToRange), draw overlay
  return <canvas ref={ref} className="overlay" />;
}
