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

### Echo / Delay (`echo.ts`, webaudio)
```
input ─┬──────────────── dry ───────────┐
       └─► Delay ─┬─────── wet ─────────┴─► out
            ▲     │
            └─ feedback ◄┘
```
| Param | Range | Default |
|---|---|---|
| time | 1 – 2000 | 40 |
| unit | px / rows | px |
| feedback | 0 – 0.95 | 0.4 |
| mix | 0 – 1 | 0.5 |

Notes:
- `DelayNode` `maxDelayTime` is set to the needed time, up to 179 s (about 7.9M samples). Longer times are clamped and a warning shows on the card.
- A delay inside a feedback loop is at least 128 samples (one render quantum). Below that, the effect uses a JS fallback.

### Distortion (`distortion.ts`, webaudio)
`input → pre-gain(drive) → WaveShaper(curve) → post-gain → mix`

| Param | Range | Default |
|---|---|---|
| drive | 1 – 100 (log) | 5 |
| curve | tanh / hard clip / foldback / bitwise-ish "fuzz" | tanh |
| oversample | none / 2x / 4x | none |
| output | −24 – 0 dB | −3 |
| mix | 0 – 1 | 1 |

The curve is a 4096-point `Float32Array`, rebuilt only when `curve` changes:
- tanh: `tanh(x)`
- hard clip: `clamp(x)`
- foldback: `sin(x·π/2)`
- fuzz: an asymmetric curve with `sign(x)·(1−e^{−|x|})`

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

Each sample is quantised: `round(x · 2^(bits−1)) / 2^(bits−1)`. With hold, each value is repeated for `hold` pixels' worth of samples.

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
