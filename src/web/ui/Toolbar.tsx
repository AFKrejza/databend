import { useStore } from '../state/store';

export function Toolbar() {
  const s = useStore();
  return (
    <header className="toolbar">
      <strong>databend</strong>
      {/* TODO: hidden <input type="file"> wired to s.importFile */}
      <button disabled>Import</button>
      <button onClick={() => void s.exportPng()} disabled={!s.image}>Export PNG</button>
      {/* TODO: Recipe ▾ menu: save / load / copy CLI command */}
      <button onClick={s.saveRecipe} disabled={!s.image}>Recipe</button>
      <button onClick={s.undo} disabled={s.history.past.length === 0}>Undo</button>
      <button onClick={s.redo} disabled={s.history.future.length === 0}>Redo</button>
      <button onClick={() => void s.bake()} disabled={s.chain.length === 0}>Bake</button>
      <button
        onPointerDown={() => s.setView({ showBefore: true })}
        onPointerUp={() => s.setView({ showBefore: false })}
        disabled={!s.image}
      >
        Before
      </button>
    </header>
  );
}
