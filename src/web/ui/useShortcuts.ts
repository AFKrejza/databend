// Keyboard shortcuts. See docs/ui.md#keyboard-shortcuts.
import { useEffect } from 'react';
import { useStore, type Tool } from '../state/store';
import { IMPORT_EVENT } from './Toolbar';

const TOOL_KEYS: Record<string, Tool> = { r: 'rect', g: 'range', p: 'pan' };

function typingInField(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
}

export function useShortcuts(): void {
  useEffect(() => {
    /** Tool to return to when Space (temporary pan) is released. */
    let toolBeforeSpace: Tool | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod) {
        const actions: Record<string, () => void> = {
          o: () => window.dispatchEvent(new Event(IMPORT_EVENT)),
          s: () => void s.exportPng(),
          z: () => (e.shiftKey ? s.redo() : s.undo()),
          y: () => s.redo(),
          enter: () => void s.bake(),
        };
        const action = actions[key];
        if (action && !(typingInField(e) && key === 'z')) {
          e.preventDefault();
          action();
        }
        return;
      }
      if (typingInField(e) || e.repeat) return;
      if (key === 'b') s.setView({ showBefore: true });
      else if (key === 'escape') s.clearSelection();
      else if (key === ' ') {
        e.preventDefault();
        toolBeforeSpace = s.view.tool;
        s.setView({ tool: 'pan' });
      } else if (TOOL_KEYS[key]) s.setView({ tool: TOOL_KEYS[key] });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (e.key.toLowerCase() === 'b') s.setView({ showBefore: false });
      if (e.key === ' ' && toolBeforeSpace) {
        s.setView({ tool: toolBeforeSpace });
        toolBeforeSpace = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
