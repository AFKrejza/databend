# Architecture

## Data flow
```
 image file
     │  createImageBitmap → canvas → getImageData
     ▼
 ImageData (RGBA bytes)  ← "base image" (original, or last baked result)
     │  stream/   pick pixel bytes using selection + layout + scan → byte stream + offsets
     ▼
 Uint8Array stream
     │  codec/    decode (μ-law default)
     ▼
 Float32Array samples ──────────────► waveform (before)
     │  engine/   run effect chain (Web Audio + JS), force length = input length
     ▼
 Float32Array samples ──────────────► waveform (after)
     │  codec/    encode
     ▼
 Uint8Array stream
     │  stream/   write bytes back through offsets into a copy of the base ImageData
     ▼
 ImageData → putImageData → canvas on screen   (export: canvas.toBlob → PNG)
```

Key rules:
- **Only pixel bytes are processed.** Alpha and everything outside the selection stay untouched. The file header is never processed, because we never work on the file itself.
- **Output length always equals input length.** Effect tails are cut off and short outputs are zero-padded. Bytes never shift position.
- **Non-destructive.** The base image is never mutated. Every render starts from it, and only "Bake" replaces it.

## Two front ends, one core
The app is used two ways: the **web GUI** and a **CLI** ([cli.md](cli.md)). Both drive the same platform-independent core.
```
            ┌──────────── src/web/ ────────────┐   ┌────── src/cli/ ──────┐
            │ React UI + zustand store         │   │ args, batch, recipes │
            │ image I/O: canvas                │   │ image I/O: sharp     │
            │ audio: window.OfflineAudioContext│   │ audio: node-web-audio-api
            └───────────────┬──────────────────┘   └──────────┬───────────┘
                            └──────────► src/core/ ◄──────────┘
                     codec · stream · effects · engine · waveform · recipe
```

## Modules
| Folder | Responsibility | Depends on |
|---|---|---|
| `core/codec/` | Pure functions: `decode(bytes, enc) → Float32Array`, `encode(samples, enc) → Uint8Array` | — |
| `core/stream/` | Builds the byte-offset table for a selection/layout/scan, then extracts and inserts bytes. Maps pixels ⇄ sample indices. | — |
| `core/effects/` | Effect definitions plus the registry. Each effect is one file. | — |
| `core/engine/` | `render(request, platform)`: stream → codec → chain → codec → stream | codec, stream, effects |
| `core/waveform/` | Peak computation and view maths (used by the GUI panel and the CLI's `--waveform`) | — |
| `core/recipe.ts` | Recipe JSON (settings + selection + chain) parse, validate and serialize. Shared by the GUI's save/load and the CLI. | effects |
| `web/state/` | zustand store: image, settings, selection, chain, history, render results. Handles debounce, cancellation and the proxy. | core |
| `web/ui/` | React components | web/state |
| `cli/` | Argument parsing, file I/O, batch runs | core |

**Rule: `core/` never touches the DOM or Node APIs.** Images are passed as `RasterImage { width, height, data: Uint8ClampedArray }`, which a browser `ImageData` already satisfies. Audio contexts come from an injected `createOfflineContext` function. That keeps the core unit-testable in Node. With `node-web-audio-api` installed as a dev dependency, even the Web Audio effects run in Vitest.

## Web state shape (sketch, `web/state/`)
```ts
interface AppState {
  image: { name: string; base: ImageData; proxy: ImageData | null; proxyScale: number } | null;
  settings: { encoding: Encoding; layout: Layout; scan: Scan };
  selection: Selection;                  // see stream-and-selection.md
  chain: EffectInstance[];               // { uid, effectId, params, bypass }
  render: {
    status: 'idle' | 'rendering' | 'error';
    output: ImageData | null;
    before: Float32Array | null;         // samples for the waveform
    after: Float32Array | null;
    offsets: Uint32Array | null;         // stream index → byte offset in ImageData
    ms: number;                          // last render time, shown in status bar
  };
  view: { showBefore: boolean; zoom: number; tool: 'rect' | 'range' | 'pan' };
  history: { past: Snapshot[]; future: Snapshot[] };
}
```
Changing `settings`, `selection` or `chain` triggers a debounced preview render. See [render-engine.md](render-engine.md).

## Why Web Audio?
`OfflineAudioContext` gives us real, native-speed biquad filters, delays, waveshapers and convolution without a server. It renders faster than real time, so a few million samples take tens of milliseconds. The effect interface also allows plain JS effects, so anything Web Audio can't do (bitcrush, reverse) is a small function. In Node, `node-web-audio-api` provides the same API, so the CLI reuses the same effect code instead of a second DSP implementation.

Rejected alternatives: all hand-written DSP in a Web Worker (more code), and a Python/pedalboard backend (needs a server, slower previews).
