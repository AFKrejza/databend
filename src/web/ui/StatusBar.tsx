import { useEffect } from 'react';
import { useStore } from '../state/store';
import { wavePositionsForPixel } from '../state/waveData';

const CHANNELS = ['R', 'G', 'B'];
const STATUS_TEXT: Partial<Record<string, string>> = {
  rendering: 'rendering…',
  refining: 'refining…',
  error: 'render failed',
};

export function StatusBar() {
  const { image, render, view, setView, notice, setNotice, selection, settings } = useStore();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  return (
    <div className="status">
      <span>{image ? `${image.name} · ${image.base.width}×${image.base.height}` : 'No image'}</span>
      {image?.proxy && !view.fullResPreview && (
        <span>{render.wave?.scale === 1 ? 'full res' : `preview ${image.proxy.width}×${image.proxy.height}`}</span>
      )}
      <span>{STATUS_TEXT[render.status] ?? `${render.ms.toFixed(0)} ms`}</span>
      <Readout />
      <span className="spacer" />
      {notice && <span className="notice">{notice}</span>}
      {selection.rect && <span>rect {selection.rect.w}×{selection.rect.h}</span>}
      {selection.range && <span>range {(selection.range.end - selection.range.start).toLocaleString()} bytes</span>}
      <span>{settings.encoding} · {settings.layout} · {settings.scan}</span>
      <label>
        <input
          type="checkbox" checked={view.fullResPreview}
          onChange={(e) => setView({ fullResPreview: e.target.checked })}
        />
        Full-res preview
      </label>
    </div>
  );
}

/** Pixel under the cursor: bytes and sample values before → after. */
function Readout() {
  const hover = useStore((s) => s.view.hoverPixel);
  const wave = useStore((s) => s.render.wave);
  const source = useStore((s) => s.render.source);
  const output = useStore((s) => s.render.output);
  if (!hover || !wave || !source || !output) return null;

  const positions = wavePositionsForPixel(wave, hover.x, hover.y);
  const hex = (b: number) => b.toString(16).padStart(2, '0').toUpperCase();
  const parts = positions.map((pos) => {
    const o = wave.offsets[pos];
    const s = Math.floor(pos / wave.bytesPerSample);
    const ch = CHANNELS[o & 3];
    return `${ch} ${hex(source.data[o])}→${hex(output.data[o])} (${wave.before[s].toFixed(2)}→${wave.after[s].toFixed(2)})`;
  });
  return (
    <span className="readout">
      px ({hover.x}, {hover.y}){positions.length ? ` · sample ${Math.floor(positions[0] / wave.bytesPerSample).toLocaleString()} · ${parts.join(' ')}` : ''}
    </span>
  );
}
