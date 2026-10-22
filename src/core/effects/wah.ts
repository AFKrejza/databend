import type { WebAudioEffect } from './types';
import { todo } from '../todo';

/** Bandpass biquad whose frequency is swept by an LFO. See docs/effects.md#wah-wahts-webaudio. */
export const wah: WebAudioEffect = {
  kind: 'webaudio',
  id: 'wah',
  name: 'Wah',
  params: [
    { key: 'center', label: 'Center', type: 'number', min: 100, max: 8000, default: 800, unit: 'hz', curve: 'log' },
    { key: 'depth', label: 'Depth', type: 'number', min: 0, max: 4000, step: 10, default: 600, unit: 'hz' },
    { key: 'period', label: 'LFO period', type: 'number', min: 1, max: 500, step: 1, default: 20, unit: 'rows' },
    {
      key: 'shape', label: 'LFO shape', type: 'select', default: 'sine',
      options: [{ value: 'sine', label: 'Sine' }, { value: 'triangle', label: 'Triangle' }, { value: 'square', label: 'Square' }],
    },
    { key: 'q', label: 'Q', type: 'number', min: 0.5, max: 20, step: 0.1, default: 5 },
    { key: 'mix', label: 'Mix', type: 'number', min: 0, max: 1, step: 0.01, default: 0.8 },
  ],
  build(ctx, input, p, ec) {
    return todo('wah.build');
  },
};
