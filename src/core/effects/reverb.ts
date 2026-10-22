import type { WebAudioEffect } from './types';
import { pxToSamples } from './units';
import { dryWet } from './mix';
import { mulberry32 } from './rng';

const impulseCache = new Map<string, Float32Array>();

/** Seeded white noise × exp(-t / (decay·length)). Cached by (lengthSamples, decay, seed). */
export function makeImpulseData(lengthSamples: number, decay: number, seed: number): Float32Array {
  const key = `${lengthSamples}:${decay}:${seed}`;
  let data = impulseCache.get(key);
  if (!data) {
    const rand = mulberry32(seed);
    const tau = Math.max(1, decay * lengthSamples);
    data = new Float32Array(lengthSamples);
    for (let i = 0; i < lengthSamples; i++) data[i] = (rand() * 2 - 1) * Math.exp(-i / tau);
    if (impulseCache.size > 16) impulseCache.clear();
    impulseCache.set(key, data);
  }
  return data;
}

/** ConvolverNode with a generated impulse. See docs/effects.md#reverb-reverbts-webaudio. */
export const reverb: WebAudioEffect = {
  kind: 'webaudio',
  id: 'reverb',
  name: 'Reverb',
  params: [
    { key: 'length', label: 'Length', type: 'number', min: 10, max: 5000, step: 1, default: 400, unit: 'px' },
    { key: 'decay', label: 'Decay', type: 'number', min: 0.1, max: 1, step: 0.01, default: 0.3 },
    { key: 'mix', label: 'Mix', type: 'number', min: 0, max: 1, step: 0.01, default: 0.4 },
  ],
  build(ctx, input, p, ec) {
    const data = makeImpulseData(pxToSamples(Number(p.length), ec), Number(p.decay), ec.seed);
    const impulse = ctx.createBuffer(1, data.length, ec.sampleRate);
    impulse.getChannelData(0).set(data);
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = impulse;
    input.connect(convolver);
    return dryWet(ctx, input, convolver, Number(p.mix));
  },
};
