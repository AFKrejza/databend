import type { WebAudioEffect } from './types';
import { todo } from '../todo';

/** Seeded white noise × exp(-t/decay). Cached by (lengthSamples, decay, seed). */
export function makeImpulse(ctx: BaseAudioContext, lengthSamples: number, decay: number, seed: number): AudioBuffer {
  return todo('makeImpulse');
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
    return todo('reverb.build');
  },
};
