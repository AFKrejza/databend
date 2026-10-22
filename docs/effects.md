# Effects

`src/core/effects/` has one file per effect plus `registry.ts`. The GUI builds each effect's controls from its parameter list, and the CLI uses the same list to parse `-f "echo time=30"` and to print `databend effects echo`. Adding an effect means writing one file and adding one line to the registry, and it then works in both front ends.

**Compatibility rule:** web-audio effects must use only standard nodes that both Chrome and `node-web-audio-api` implement: Gain, Delay, BiquadFilter, WaveShaper, Convolver, Oscillator, DynamicsCompressor and AudioBufferSource. No `AudioWorklet`. If something needs custom per-sample code, make it a `js` effect.

## Interface (`types.ts`)
```ts
type ParamSpec =
  | { key: string; label: string; type: 'number'; min: number; max: number; step?: number;
      default: number; unit?: Unit; curve?: 'linear' | 'log' }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: 'bool'; default: boolean };

type Unit = 'px' | 'rows' | 'hz' | 'db' | '%' | 'x';

interface EffectContext {
  sampleRate: number;        // always 44100 (a made-up rate; it only makes Hz meaningful)
  samplesPerPixel: number;   // stream samples per image pixel (3, 1, or 1.5 for 16-bit interleaved)
  rowLength: number;         // samples per scan line of the base stream
  scale: number;             // proxy scale (1 at full res)
  seed: number;              // for deterministic randomness
}

interface WebAudioEffect {
  kind: 'webaudio'; id: string; name: string; params: ParamSpec[];
  build(ctx: BaseAudioContext, input: AudioNode, p: Params, ec: EffectContext): AudioNode; // returns output node; ctx comes from platform.createOfflineContext
}
interface JsEffect {
  kind: 'js'; id: string; name: string; params: ParamSpec[];
  process(x: Float32Array, p: Params, ec: EffectContext): Float32Array; // may modify x in place; must keep length
}
type Effect = WebAudioEffect | JsEffect;
```

## Units
Users think in pixels, not seconds, so time-like parameters are shown in image units and converted with helpers in `units.ts`:

| Unit | Converts to samples as | Example |
|---|---|---|
| `px` | `round(v × samplesPerPixel × scale)` | Echo 30 px makes a ghost 30 px to the right |
| `rows` | `round(v × rowLength)` (rowLength is already at proxy scale) | Echo 20 rows makes a ghost 20 rows down |
| `hz` | stays Hz at full res, divided by `scale` on the proxy and clamped to Nyquist (22050) | Filter cutoffs keep their look on the proxy |

Rule: **every effect must look the same on the proxy as at full res**, apart from detail. So never use raw sample counts in params.

**Determinism:** anything random, like a reverb impulse or noise, uses a seeded PRNG (mulberry32 from `ec.seed`). Re-renders must not flicker.

## v1 effects
In each node diagram below, "dry" and "wet" are gain nodes summed into one output. `mix` sets wet = mix and dry = 1 − mix.

### Echo / Delay (`echo.ts`, js)
```
wet[i] = x[i − d] + feedback · wet[i − d]          d = time in samples
out    = (1 − mix) · x + mix · wet
```
| Param | Range | Default |
|---|---|---|
| time | 1 – 2000 | 40 |
| unit | px / rows | px |
| feedback | 0 – 0.95 | 0.4 |
| mix | 0 – 1 | 0.5 |

This is plain JS rather than a Web Audio `DelayNode`. Web Audio forces a delay inside a feedback loop to at least 128 samples (one render quantum), which would break short echoes (under about 43 px in interleaved mode). The loop is exact at any length and gives identical results in the GUI and CLI.

### Distortion (`distortion.ts`, webaudio)
`input → WaveShaper(curve with drive baked in) → output gain → mix`

| Param | Range | Default |
|---|---|---|
| drive | 1 – 100 (log) | 5 |
| curve | tanh / hard clip / foldback / bitwise-ish "fuzz" | tanh |
| oversample | none / 2x / 4x | none |
| output | −24 – 0 dB | −3 |
| mix | 0 – 1 | 1 |

The curve is a 4096-point `Float32Array` over x ∈ [−1, 1], cached by (curve, drive). Drive is baked into the curve instead of using a pre-gain node. A WaveShaper clamps its input to [−1, 1], so a pre-gain would just clip everything before it reached the curve.
- tanh: `tanh(d·x) / tanh(d)`
- hard clip: `clamp(d·x)`
- foldback: `sin(d·x·π/2)`
- fuzz: `(1 − e^{−d·x}) / (1 − e^{−d})` for x ≥ 0. The negative side uses half the drive, so it's asymmetric.

### Wah (`wah.ts`, webaudio)
```
LFO (Oscillator) ─► depth (Gain) ─► filter.frequency
input ─┬──── dry ───────────────┐
       └─► Biquad(bandpass) ─ wet ┴─► out
```
| Param | Range | Default |
|---|---|---|
| center | 100 – 8000 Hz (log) | 800 |
| depth | 0 – 4000 Hz | 600 |
| period | 1 – 500 rows (LFO period) | 20 |
| shape | sine / triangle / square | sine |
| Q | 0.5 – 20 | 5 |
| mix | 0 – 1 | 0.8 |

Notes:
- The LFO frequency is `sampleRate / (period × rowLength)`, so one wah sweep spans a predictable number of rows and the wobble shows up as horizontal bands.
- Biquad frequency is an a-rate `AudioParam`. Its base value is `center`, and the LFO output × depth is added to it. The value is clamped so that `center − depth ≥ 20`.

### Filter (`filter.ts`, webaudio)
A single `BiquadFilterNode`.

| Param | Range | Default |
|---|---|---|
| type | lowpass / highpass / bandpass / notch / peaking | lowpass |
| frequency | 20 – 20000 Hz (log) | 2000 |
| Q | 0.1 – 30 | 1 |
| gain | −24 – 24 dB (peaking only) | 0 |

Low-pass blurs and smears along the scan direction. High-pass gives an edge-detect / emboss look.

### Reverb (`reverb.ts`, webaudio)
`ConvolverNode` with a generated impulse: seeded white noise × `exp(−t/decay)`, with length in px.

| Param | Range | Default |
|---|---|---|
| length | 10 – 5000 px | 400 |
| decay | 0.1 – 1 (fraction of length) | 0.3 |
| mix | 0 – 1 | 0.4 |

The impulse is cached by (length in samples, decay, seed). Convolution is FFT-based in the browser, so even long impulses are fast.

### Bitcrush (`bitcrush.ts`, js)
| Param | Range | Default |
|---|---|---|
| bits | 1 – 16 | 4 |
| hold | 1 – 64 px (sample-and-hold, i.e. downsample) | 1 |

Each sample is quantised: `round(x · 2^(bits−1)) / 2^(bits−1)`. Hold works **per channel**: every pixel in a block of `hold` pixels copies the channel values of the block's first pixel, giving horizontal pixelation that keeps the colours. `hold = 1` turns it off.

### Reverse (`reverse.ts`, js)
Reverses the samples in place. No params. With rows scan, the region is mirrored and also shifted by row wrap. With a rect selection it looks like a 180° rotation.

### Gain / Invert (`gain.ts`, js)
| Param | Range | Default |
|---|---|---|
| gain | −24 – +24 dB | 0 |
| invert | bool | false |
| offset (DC) | −1 – 1 | 0 |

### Normalize (`normalize.ts`, js)
Scales the samples so the peak reaches `target` (−12 – 0 dB). Under μ-law, small gains already cause big colour shifts.

## How the engine runs a chain
Bypassed effects are skipped. Consecutive `webaudio` effects are grouped into **one** `OfflineAudioContext` render: source → effect1 → effect2 → … → destination. `js` effects run between groups on the plain `Float32Array`. Details are in [render-engine.md](render-engine.md).

If an effect throws during `build` or `process`, that effect is skipped, the error shows on its card, and the rest of the chain still runs.

## Ideas after v1
Phaser, chorus/flanger (modulated short delay), pitch shift, envelope-follower auto-wah, "shift/rotate stream by N px", compressor (`DynamicsCompressorNode`), and presets.
