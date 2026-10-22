# UI

React components live in `src/web/ui/`. They read and write the zustand store and never call the engine directly. The store triggers renders.

## Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Toolbar: Import · Export PNG · Recipe ▾ · Undo · Redo · Bake · B/A   │
├───────────────┬──────────────────────────────────┬───────────────────┤
│ Settings      │                                  │ Effect chain      │
│  Encoding     │          Canvas view             │  [+ Add effect ▾] │
│  Layout       │   (image + selection overlay)    │  ┌ Echo ──── ⏻ ✕ ┐│
│  Scan         │                                  │  │ time  ──●──   ││
│  Tool: ▭ ⋯ ✋  │                                  │  │ fb    ─●───   ││
│  Selection    │                                  │  └───────────────┘│
│   info/clear  │                                  │  ┌ Wah ───── ⏻ ✕ ┐│
├───────────────┴──────────────────────────────────┴───────────────────┤
│ Waveform panel  (before grey / after colour, selection, row ticks)    │
├──────────────────────────────────────────────────────────────────────┤
│ Status: 1920×1080 · proxy 1024×576 · 1.77M samples · 38 ms · cursor  │
└──────────────────────────────────────────────────────────────────────┘
```
The side panels can be resized or collapsed. The waveform panel is about 160 px tall and resizable.

## Components
| Component | Job |
|---|---|
| `App.tsx` | Grid layout, global keyboard shortcuts, drop zone |
| `Toolbar.tsx` | Import (file input), Export, Recipe menu (save, load, "Copy CLI command"), Undo/Redo, Bake, Before/After |
| `SettingsPanel.tsx` | Encoding / layout / scan dropdowns, tool picker, selection readout and a clear button |
| `CanvasView.tsx` | Draws the current output (or `base` while Before is held) to a canvas. Handles zoom and pan. |
| `SelectionOverlay.tsx` | Transparent canvas on top that draws the rect, the range band and the hover crosshair, and handles pointer drags |
| `EffectChain.tsx` | Ordered list of `EffectCard`s plus the "Add effect" menu (from the registry) |
| `EffectCard.tsx` | Header with name, bypass ⏻, ▲▼ / drag handle and remove ✕. Body has controls built from `ParamSpec`. Errors and warnings show inline. |
| `ParamControl.tsx` | One control: slider plus number box (number), dropdown (select) or checkbox (bool). Log curve when `curve: 'log'`. Shows the unit. |
| `WaveformView.tsx` | See [waveform.md](waveform.md) |
| `StatusBar.tsx` | Image size, proxy size, sample count, render ms, cursor readout, "Full-res preview" toggle |

## Interactions
**Import**
- Use the toolbar button, drag and drop onto the window, or paste with Ctrl+V.
- Supported formats are whatever the browser decodes: PNG, JPEG, WebP, GIF (first frame), BMP, AVIF.
- Browsers can't open TIFF. If needed later, add the `utif` library. For now, the old GIMP → TIFF step isn't needed at all.

**Recipes:** save the current settings, selection and chain as a `.json` recipe, or load one. See [cli.md](cli.md#recipes-shared-with-the-gui). "Copy CLI command" puts the equivalent `databend ... -f ...` command on the clipboard, so you can repeat a look from the terminal.

**Canvas**
- The image fits to the view on load. Use the mouse wheel to zoom and the pan tool (or hold Space) to pan.
- Above 200 % zoom the canvas uses `image-rendering: pixelated`, so individual glitched pixels are visible.

**Selection tools**
- ▭ **Rect:** drag a rectangle; Shift constrains it to a square.
- ⋯ **Range:** drag from a start pixel to an end pixel. The overlay shows the wrapped band of rows, as in Audacity.
- ✋ **Pan**
- Esc clears the selection, and double-clicking the waveform selects all.

**Effect cards**
- Changing a parameter re-renders live.
- Double-click a slider to reset it to its default.
- The ⏻ toggle bypasses an effect without losing its settings.
- Reordering changes the result, because the effects run top to bottom.

## Keyboard shortcuts
| Key | Action |
|---|---|
| Ctrl+O | Import |
| Ctrl+S | Export PNG |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |
| Ctrl+Enter | Bake |
| B (hold) | Show before |
| R / G / P | Rect / range / pan tool |
| Esc | Clear selection |
| Space (hold) | Temporary pan |

## Look
- Dark UI, so the image stands out, with one accent colour (also used for the "after" waveform).
- One plain stylesheet (`web/ui/app.css`) with CSS variables, and no UI library. The interface is small.
