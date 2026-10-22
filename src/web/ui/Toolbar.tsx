import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';

/** Fired by the Ctrl+O shortcut. */
export const IMPORT_EVENT = 'databend:import';

export function Toolbar() {
  const s = useStore();
  const imageInput = useRef<HTMLInputElement>(null);
  const recipeInput = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const open = () => imageInput.current?.click();
    window.addEventListener(IMPORT_EVENT, open);
    return () => window.removeEventListener(IMPORT_EVENT, open);
  }, []);

  const closeMenu = () => menu.current?.removeAttribute('open');

  return (
    <header className="toolbar">
      <strong className="logo">databend</strong>
      <input
        ref={imageInput} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void s.importFile(f); e.target.value = ''; }}
      />
      <input
        ref={recipeInput} type="file" accept=".json,application/json" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void s.loadRecipe(f); e.target.value = ''; }}
      />
      <button onClick={() => imageInput.current?.click()} title="Ctrl+O">Import</button>
      <button onClick={() => void s.exportPng()} disabled={!s.image} title="Ctrl+S">Export PNG</button>
      <details className="menu" ref={menu}>
        <summary>Recipe ▾</summary>
        <div className="menu-items">
          <button onClick={() => { s.saveRecipe(); closeMenu(); }}>Save recipe…</button>
          <button onClick={() => { recipeInput.current?.click(); closeMenu(); }}>Load recipe…</button>
          <button onClick={() => { void s.copyCliCommand(); closeMenu(); }}>Copy CLI command</button>
        </div>
      </details>
      <span className="sep" />
      <button onClick={s.undo} disabled={s.history.past.length === 0} title="Ctrl+Z">Undo</button>
      <button onClick={s.redo} disabled={s.history.future.length === 0} title="Ctrl+Shift+Z">Redo</button>
      <button onClick={() => void s.bake()} disabled={!s.image || s.chain.length === 0} title="Ctrl+Enter">
        Bake
      </button>
      <button
        className={s.view.showBefore ? 'active' : ''}
        onPointerDown={() => s.setView({ showBefore: true })}
        onPointerUp={() => s.setView({ showBefore: false })}
        onPointerLeave={() => s.setView({ showBefore: false })}
        disabled={!s.image}
        title="Hold (or hold B) to see the original"
      >
        Before
      </button>
    </header>
  );
}
