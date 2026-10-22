import { ENCODINGS, LAYOUTS, SCANS, type Encoding, type Layout, type Scan } from '../../core/types';
import { useStore, type Tool } from '../state/store';

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'rect', label: '▭ Rect', key: 'R' },
  { id: 'range', label: '⋯ Range', key: 'G' },
  { id: 'pan', label: '✋ Pan', key: 'P' },
];

const LAYOUT_LABELS: Record<Layout, string> = {
  interleaved: 'interleaved (RGB RGB…)',
  planar: 'planar (RRR… GGG… BBB…)',
  r: 'red only',
  g: 'green only',
  b: 'blue only',
};

export function SettingsPanel() {
  const { settings, setSettings, view, setView, selection, clearSelection } = useStore();
  return (
    <aside className="panel settings">
      <h3>Stream</h3>
      <label>
        Encoding
        <select value={settings.encoding} onChange={(e) => setSettings({ encoding: e.target.value as Encoding })}>
          {ENCODINGS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Layout
        <select value={settings.layout} onChange={(e) => setSettings({ layout: e.target.value as Layout })}>
          {LAYOUTS.map((v) => <option key={v} value={v}>{LAYOUT_LABELS[v]}</option>)}
        </select>
      </label>
      <label>
        Scan
        <select value={settings.scan} onChange={(e) => setSettings({ scan: e.target.value as Scan })}>
          {SCANS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>

      <h3>Selection</h3>
      <div className="tools">
        {TOOLS.map((t) => (
          <button
            key={t.id} aria-pressed={view.tool === t.id} title={`${t.label} (${t.key})`}
            onClick={() => setView({ tool: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small">
        {selection.rect && `Rect ${selection.rect.w}×${selection.rect.h} at (${selection.rect.x}, ${selection.rect.y})`}
        {selection.rect && selection.range && <br />}
        {selection.range && `Range ${selection.range.start.toLocaleString()}–${selection.range.end.toLocaleString()}`}
        {!selection.rect && !selection.range && 'Whole image. Drag on the image or the waveform to select.'}
      </p>
      <button onClick={clearSelection} disabled={!selection.rect && !selection.range} title="Esc">
        Clear selection
      </button>
    </aside>
  );
}
