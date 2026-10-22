// Grid layout, global shortcuts, drop zone and paste. See docs/ui.md#layout.
import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Toolbar } from './Toolbar';
import { SettingsPanel } from './SettingsPanel';
import { CanvasView } from './CanvasView';
import { EffectChain } from './EffectChain';
import { WaveformView } from './WaveformView';
import { StatusBar } from './StatusBar';
import { useShortcuts } from './useShortcuts';

function firstImage(files: FileList | undefined | null): File | null {
  return Array.from(files ?? []).find((f) => f.type.startsWith('image/')) ?? null;
}

export function App() {
  useShortcuts();
  const importFile = useStore((s) => s.importFile);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = firstImage(e.clipboardData?.files);
      if (file) void importFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [importFile]);

  return (
    <div
      className={`app${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = firstImage(e.dataTransfer.files);
        if (file) void importFile(file);
      }}
    >
      <Toolbar />
      <SettingsPanel />
      <CanvasView />
      <EffectChain />
      <WaveformView />
      <StatusBar />
    </div>
  );
}
