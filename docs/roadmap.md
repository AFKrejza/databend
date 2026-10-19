# Roadmap

Each milestone is small and leaves the app runnable. Tick items off as they are done.

## M1: Scaffold, import and export
- [ ] Vite + React + TS project, ESLint, Vitest, zustand
- [ ] Import an image (button and drag-drop) and draw it on the canvas
- [ ] Export the canvas as PNG
- [ ] Basic layout skeleton (toolbar, panels, status bar)

## M2: Codec and stream (pure TS + tests)
- [ ] `codec/`: μ-law, A-law, u8, s8, s16be, s16le with round-trip tests
- [ ] `stream/`: `buildOffsets` for layouts × scans, extract/insert, `pixelToSamples`, with tests
- [ ] Settings panel dropdowns for encoding, layout and scan

## M3: Render engine with a first effect
- [ ] `engine/render.ts` pipeline (empty chain = decode/encode round trip)
- [ ] Gain/Invert JS effect
- [ ] Debounced live preview with generation-based cancellation, render time in the status bar

## M4: Web Audio effects
- [ ] Effect registry and `ParamSpec` → auto-generated controls
- [ ] Echo, then distortion, then wah, filter and reverb
- [ ] Bitcrush, reverse, normalize
- [ ] Unit conversion helpers (px / rows / hz)

## M5: Selection
- [ ] Rect tool and overlay
- [ ] Range tool (wrapped band)
- [ ] Selection readout, Esc to clear

## M6: Waveform panel
- [ ] Peak cache and drawing, before/after overlay and stacked toggle
- [ ] Zoom, scroll, minimap, row ticks
- [ ] Linked selection and linked cursor, status-bar readout

## M7: Effect chain, bake and undo
- [ ] Add, remove, reorder and bypass effects
- [ ] Bake
- [ ] Undo/redo history with slider-drag coalescing

## M8: Proxy and polish
- [ ] Preview proxy for large images, full-res export, "Full-res preview" toggle
- [ ] Before/after hold-key, keyboard shortcuts, paste import
- [ ] Browser tests for the Web Audio effects
- [ ] Presets (stretch goal)
