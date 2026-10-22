# Render engine

`src/core/engine/` turns (base image, settings, selection, chain) into an output image plus before/after samples for the waveform. The web app and the [CLI](cli.md) both use it.

## Platform adapters
The engine is platform-independent. Everything platform-specific is passed in:
```ts
interface RasterImage { width: number; height: number; data: Uint8ClampedArray } // ImageData fits this
interface Platform {
  createOfflineContext(channels: number, length: number, sampleRate: number): BaseAudioContext & { startRendering(): Promise<AudioBuffer> };
}
// web:  { createOfflineContext: (c, n, r) => new OfflineAudioContext(c, n, r) }
// cli:  same, but OfflineAudioContext imported from 'node-web-audio-api'
```
Image decoding and encoding happen outside the engine: canvas in the web app, `sharp` in the CLI. Debounce, cancellation and the proxy are GUI concerns, so they live in `web/state/`. The engine function itself is a plain `async render(req, platform)`.

## One render
```ts
interface RenderRequest {
  source: RasterImage;        // base image, or its proxy
  scale: number;              // 1 = full res
  settings: { encoding; layout; scan };
  selection: Selection;       // full-res coords; mapped by `scale`
  chain: EffectInstance[];
  seed: number;
}
interface RenderResult {
  image: RasterImage; before: Float32Array; after: Float32Array; offsets: Uint32Array; ms: number;
  errors: Record<string /*effect uid*/, string>;
}
render(req: RenderRequest, platform: Platform): Promise<RenderResult>
```
Steps:
1. **Offsets:** `buildOffsets(...)`, cached by (width, height, selection, layout, scan).
2. **Extract** the bytes, then `before = decode(bytes, encoding)`.
3. **Run the chain** on a copy of `before`:
   - Group consecutive web-audio effects. For each group:
     - Create a context with `platform.createOfflineContext(1, n, 44100)`.
     - Copy the samples into an `AudioBuffer` and connect `AudioBufferSourceNode` → `effect.build(...)` for each effect in turn → `ctx.destination`.
     - Call `source.start()`, then `await ctx.startRendering()` and read channel 0.
   - The context length is fixed at `n`, so tails are cut off automatically.
   - Run JS effects directly on the array. If an effect returns the wrong length, pad or truncate it.
4. `after` is the result. Encode it back to bytes of length `n`.
5. **Insert:** copy `source` with `{ width, height, data: new Uint8ClampedArray(source.data) }`, then write the bytes through `offsets`. The web app wraps the result in `new ImageData(...)` to draw it.
6. Return the result together with the timing.

An empty chain skips step 3, which means the output is the source decoded and re-encoded. This is a useful sanity check.

In the browser, `OfflineAudioContext` is only available on the main thread, but `startRendering()` is asynchronous and runs off-thread in browsers. The parts that block the main thread are steps 1, 2, 4 and 5, which are linear loops taking a few ms per megapixel. If profiling shows the JS effects or the codec blocking, they can move to a Web Worker later. The web-audio part can't.

## Live preview (web only, `web/state/`)
- Any change to `settings`, `selection` or `chain` (including each slider tick) calls `requestPreview()`.
- **Debounce** waits 60 ms of quiet, then renders. Dragging a slider therefore updates roughly every 60 ms.
- **Cancellation by generation:** each request increments `gen`. When a render finishes, its result is dropped if `gen` has moved on. The newest settings always win, and older renders that finish late are discarded.
- While rendering, the status bar shows a spinner and the last render time ("38 ms"). If renders take more than about 300 ms, the debounce grows to match.

## Preview proxy (web only; the CLI always renders at full res)
If `max(W, H) > 1024`, a downscaled **proxy** is created once at import or bake time. It uses a canvas `drawImage` with `imageSmoothingQuality = 'high'`, and `scale = 1024 / max(W, H)`.
- Previews render on the proxy, and the canvas shows the proxy stretched to the display size.
- Parameters use pixel units (see [effects.md](effects.md#units)), so the proxy looks like a lower-detail version of the final result.
- A "Full-res preview" toggle in the status bar skips the proxy, which is slower but exact.
- **Export** and **Bake** always run one render on the full-res base.

## Bake
Bake turns the current chain into a permanent change:
1. Run a full-res render.
2. The result becomes the new `base`, and the proxy is regenerated.
3. The chain is cleared and the selection kept.
4. A history snapshot is pushed.

This lets you layer effects with different settings, for example "echo the whole image, bake, then wah only the sky".

## Undo / redo
```ts
interface Snapshot { base: ImageData; chain: EffectInstance[]; settings; selection }
```
- Snapshots share `base` by reference unless a bake happened, so chain and slider edits are cheap.
- A slider drag is merged into one snapshot, taken on pointer up.
- History is capped by memory: about 400 MB of distinct bases, after which the oldest are dropped.
- Shortcuts are Ctrl+Z and Ctrl+Shift+Z / Ctrl+Y.

## Before / after
Holding the **B** key (or the toolbar button) shows `base` instead of the output. Nothing is re-rendered.

## Export
1. Run a full-res render, or reuse the last one if it was full-res and nothing has changed.
2. Draw it to an offscreen canvas and call `toBlob('image/png')`.
3. Download it as `<name>-bent.png`.

PNG is lossless, so every bent byte survives.
