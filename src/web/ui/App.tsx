// Grid layout, global shortcuts, drop zone. See docs/ui.md#layout.
import { Toolbar } from './Toolbar';
import { SettingsPanel } from './SettingsPanel';
import { CanvasView } from './CanvasView';
import { EffectChain } from './EffectChain';
import { WaveformView } from './WaveformView';
import { StatusBar } from './StatusBar';
import { useShortcuts } from './useShortcuts';

export function App() {
  useShortcuts();
  // TODO: window drag-and-drop and paste import → store.importFile
  return (
    <div className="app">
      <Toolbar />
      <SettingsPanel />
      <CanvasView />
      <EffectChain />
      <WaveformView />
      <StatusBar />
    </div>
  );
}
