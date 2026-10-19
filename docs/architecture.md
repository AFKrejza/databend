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

## Modules (`src/`)
| Folder | Responsibility | Depends on |
|---|---|---|
| `codec/` | Pure functions: `decode(bytes, enc) → Float32Array`, `encode(samples, enc) → Uint8Array` | — |
| `stream/` | Builds the byte-offset table for a selection/layout/scan, then extracts and inserts bytes. Maps pixels ⇄ sample indices. | — |
| `effects/` | Effect definitions plus the registry. Each effect is one file. | — |
| `engine/` | Orchestrates a render: stream → codec → chain → codec → stream. Handles debounce, cancellation and the proxy. | codec, stream, effects |
| `waveform/` | Peak computation and coordinate maths for the waveform panel | — |
| `state/` | zustand store: image, settings, selection, chain, history, render results | engine |
| `ui/` | React components | state |

The lower layers (`codec`, `stream`, `effects` JS parts, `waveform`) are plain TypeScript with no DOM or React. That keeps them unit-testable in Node.

## State shape (sketch)
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
`OfflineAudioContext` gives us real, native-speed biquad filters, delays, waveshapers and convolution without a server. It renders faster than real time, so a few million samples take tens of milliseconds. The effect interface also allows plain JS effects, so anything Web Audio can't do (bitcrush, reverse) is a small function.

Rejected alternatives: all hand-written DSP in a Web Worker (more code), and a Python/pedalboard backend (needs a server, slower previews).
