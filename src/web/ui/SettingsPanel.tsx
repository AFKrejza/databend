import { ENCODINGS, LAYOUTS, SCANS, type Encoding, type Layout, type Scan } from '../../core/types';
import { useStore, type Tool } from '../state/store';

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'rect', label: '▭ Rect' },
  { id: 'range', label: '⋯ Range' },
  { id: 'pan', label: '✋ Pan' },
];

export function SettingsPanel() {
  const { settings, setSettings, view, setView, selection, clearSelection } = useStore();
  return (
    <aside className="panel settings">
      <label>
        Encoding
        <select value={settings.encoding} onChange={(e) => setSettings({ encoding: e.target.value as Encoding })}>
          {ENCODINGS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Layout
        <select value={settings.layout} onChange={(e) => setSettings({ layout: e.target.value as Layout })}>
          {LAYOUTS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Scan
        <select value={settings.scan} onChange={(e) => setSettings({ scan: e.target.value as Scan })}>
          {SCANS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <div className="tools">
        {TOOLS.map((t) => (
          <button key={t.id} aria-pressed={view.tool === t.id} onClick={() => setView({ tool: t.id })}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="selection-info">
        {/* TODO: human-readable readout (rect size, range in samples/pixels) */}
        <span>{selection.rect || selection.range ? 'Selection active' : 'Whole image'}</span>
        <button onClick={clearSelection}>Clear</button>
      </div>
    </aside>
  );
}
