# Roadmap

Each milestone is small and leaves the app runnable. Tick items off as they are done.

## M1: Scaffold, import and export
- [x] Vite + React + TS project, Vitest, zustand. Folders `src/core`, `src/web`, `src/cli`.
- [ ] ESLint (including a rule banning DOM/Node globals in `src/core`)
- [x] Spike: confirm that `node-web-audio-api` runs an `OfflineAudioContext` with Delay, Biquad, WaveShaper and Convolver on Windows. If it doesn't, fall back to JS versions of those effects for the CLI.
- [ ] Import an image (button and drag-drop) and draw it on the canvas
- [ ] Export the canvas as PNG
- [ ] Basic layout skeleton (toolbar, panels, status bar)

## M2: Codec and stream (pure TS + tests)
- [x] `codec/`: μ-law, A-law, u8, s8, s16be, s16le with round-trip tests
- [x] `stream/`: `buildOffsets` for layouts × scans, extract/insert, `pixelToSamples`, with tests
- [x] Settings panel dropdowns for encoding, layout and scan

## M3: Render engine with a first effect
- [ ] `core/engine/render.ts` pipeline with `RasterImage` + `Platform` injection (empty chain = decode/encode round trip)
- [ ] Minimal CLI: `databend in.png -o out.png -e mulaw` (sharp I/O, empty chain). This proves the core works in Node from day one.
- [ ] Gain/Invert JS effect
- [ ] Debounced live preview with generation-based cancellation, render time in the status bar

## M4: Web Audio effects
- [ ] Effect registry and `ParamSpec` → auto-generated controls
- [ ] Echo, then distortion, then wah, filter and reverb
- [ ] Bitcrush, reverse, normalize
- [ ] Unit conversion helpers (px / rows / hz)
- [ ] Web Audio effect tests in Node via `node-web-audio-api`

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

## M8: Full CLI and recipes
- [ ] `core/recipe.ts`: parse, validate, serialize, with tests
- [ ] CLI flags: `-f` effects, `--rect`/`--range`, `-r` recipe, `--seed`, `--dry-run`, `effects` subcommand
- [ ] Batch mode with glob expansion, output folder and per-file error handling
- [ ] `--waveform out.png`
- [ ] GUI: save/load recipe and "Copy CLI command"
- [ ] `npm run build:cli` + `bin` entry, so `npm link` gives a global `databend`
- [ ] CLI integration tests

## M9: Proxy and polish
- [ ] Preview proxy for large images, full-res export, "Full-res preview" toggle
- [ ] Before/after hold-key, keyboard shortcuts, paste import
- [ ] Browser smoke test (Playwright)
- [ ] Presets (stretch goal)
