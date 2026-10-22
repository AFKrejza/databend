import type { WebAudioEffect } from './types';
import { dbToGain } from './units';
import { dryWet } from './mix';

export type CurveType = 'tanh' | 'hard' | 'foldback' | 'fuzz';

const SHAPES: Record<CurveType, (x: number, drive: number) => number> = {
  tanh: (x, d) => Math.tanh(d * x) / Math.tanh(d),
  hard: (x, d) => Math.max(-1, Math.min(1, d * x)),
  foldback: (x, d) => Math.sin((d * x * Math.PI) / 2),
  // Asymmetric: the negative half saturates more gently.
  fuzz: (x, d) => x >= 0
    ? (1 - Math.exp(-d * x)) / (1 - Math.exp(-d))
    : -(1 - Math.exp(0.5 * d * x)) / (1 - Math.exp(-0.5 * d)),
};

const curveCache = new Map<string, Float32Array>();

/** WaveShaper curve over x ∈ [-1, 1] with the drive baked in, so nothing clips before shaping. */
export function makeCurve(type: CurveType, drive: number, points = 4096): Float32Array {
  const key = `${type}:${drive}:${points}`;
  let curve = curveCache.get(key);
  if (!curve) {
    curve = new Float32Array(points);
    for (let i = 0; i < points; i++) curve[i] = SHAPES[type]((2 * i) / (points - 1) - 1, drive);
    if (curveCache.size > 64) curveCache.clear();
    curveCache.set(key, curve);
  }
  return curve;
}

/** WaveShaper → output gain → dry/wet. See docs/effects.md#distortion-distortionts-webaudio. */
export const distortion: WebAudioEffect = {
  kind: 'webaudio',
  id: 'distortion',
  name: 'Distortion',
  params: [
    { key: 'drive', label: 'Drive', type: 'number', min: 1, max: 100, default: 5, unit: 'x', curve: 'log' },
    {
      key: 'curve', label: 'Curve', type: 'select', default: 'tanh',
      options: [
        { value: 'tanh', label: 'tanh' },
        { value: 'hard', label: 'Hard clip' },
        { value: 'foldback', label: 'Foldback' },
        { value: 'fuzz', label: 'Fuzz' },
      ],
    },
    {
      key: 'oversample', label: 'Oversample', type: 'select', default: 'none',
      options: [{ value: 'none', label: 'None' }, { value: '2x', label: '2x' }, { value: '4x', label: '4x' }],
    },
    { key: 'output', label: 'Output', type: 'number', min: -24, max: 0, step: 0.5, default: -3, unit: 'db' },
    { key: 'mix', label: 'Mix', type: 'number', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  build(ctx, input, p) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeCurve(p.curve as CurveType, Number(p.drive)) as Float32Array<ArrayBuffer>;
    shaper.oversample = p.oversample as OverSampleType;
    const out = ctx.createGain();
    out.gain.value = dbToGain(Number(p.output));
    input.connect(shaper).connect(out);
    return dryWet(ctx, input, out, Number(p.mix));
  },
};
