# Roadmap

Each milestone is small and leaves the app runnable. Tick items off as they are done.
"(unverified)" means implemented and type-checked but not yet covered by a test or the smoke script, so try it by hand.

## M1: Scaffold, import and export
- [x] Vite + React + TS project, Vitest, zustand. Folders `src/core`, `src/web`, `src/cli`.
- [ ] ESLint (including a rule banning DOM/Node globals in `src/core`)
- [x] Spike: confirm that `node-web-audio-api` runs an `OfflineAudioContext` with Delay, Biquad, WaveShaper and Convolver on Windows. If it doesn't, fall back to JS versions of those effects for the CLI.
- [x] Import an image (button) and draw it on the canvas. Drag-drop is implemented (unverified).
- [x] Export the canvas as PNG
- [x] Basic layout skeleton (toolbar, panels, status bar)

## M2: Codec and stream (pure TS + tests)
- [x] `codec/`: μ-law, A-law, u8, s8, s16be, s16le with round-trip tests
- [x] `stream/`: `buildOffsets` for layouts × scans, extract/insert, `pixelToSamples`, with tests
- [x] Settings panel dropdowns for encoding, layout and scan

## M3: Render engine with a first effect
- [x] `core/engine/render.ts` pipeline with `RasterImage` + `Platform` injection (empty chain = decode/encode round trip)
- [x] Minimal CLI: `databend in.png -o out.png -e mulaw` (sharp I/O, empty chain). This proves the core works in Node from day one.
- [x] Gain/Invert JS effect
- [x] Debounced live preview (one render at a time, newest request wins), render time in the status bar

## M4: Web Audio effects
- [x] Effect registry and `ParamSpec` (controls are generated in `ParamControl.tsx`)
- [x] Echo (JS), then distortion, then wah, filter and reverb
- [x] Bitcrush, reverse, normalize
- [x] Unit conversion helpers (px / rows / hz)
- [x] Web Audio effect tests in Node via `node-web-audio-api`

## M5: Selection
- [x] Rect tool and overlay
- [x] Range tool (wrapped band). The image-side range tool is unverified; waveform range is tested.
- [x] Selection readout, Esc to clear

## M6: Waveform panel
- [x] Peak cache and drawing, before/after overlay. The stacked toggle is unverified.
- [x] Row ticks. Zoom, scroll and minimap are unverified.
- [x] Linked selection and linked cursor, status-bar readout

## M7: Effect chain, bake and undo
- [x] Add and bypass effects. Remove and reorder are unverified.
- [x] Bake
- [x] Undo/redo history with slider-drag coalescing (the coalescing is unverified)

## M8: Full CLI and recipes
- [x] `core/recipe.ts`: parse, validate, serialize, with tests
- [x] CLI flags: `-f` effects, `--rect`/`--range`, `-r` recipe, `--seed`, `--dry-run`, `effects` subcommand
- [x] Batch mode with glob expansion, output folder and per-file error handling
- [x] `--waveform out.png`
- [x] GUI: save/load recipe. "Copy CLI command" is unverified in the browser; the command format is unit-tested.
- [x] `npm run build:cli` + `bin` entry, so `npm link` gives a global `databend`
- [x] CLI integration tests

## M9: Proxy and polish
- [x] Preview proxy for large images, auto-refine to full res when idle, full-res export, "Full-res preview" toggle
- [x] Keyboard shortcuts (Ctrl+Z / Shift+Z tested). Hold-B before/after and paste import are unverified.
- [x] Browser smoke test (`npm run smoke`, playwright-core + system Edge/Chrome)
- [ ] Web Worker for codec/extract/JS effects if full-res refines stutter the UI
- [ ] CLI vs browser output comparison test
- [ ] Presets (stretch goal)
