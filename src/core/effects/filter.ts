import type { WebAudioEffect } from './types';
import { todo } from '../todo';

/** A single BiquadFilterNode. See docs/effects.md#filter-filterts-webaudio. */
export const filter: WebAudioEffect = {
  kind: 'webaudio',
  id: 'filter',
  name: 'Filter',
  params: [
    {
      key: 'type', label: 'Type', type: 'select', default: 'lowpass',
      options: [
        { value: 'lowpass', label: 'Low-pass' },
        { value: 'highpass', label: 'High-pass' },
        { value: 'bandpass', label: 'Band-pass' },
        { value: 'notch', label: 'Notch' },
        { value: 'peaking', label: 'Peaking' },
      ],
    },
    { key: 'frequency', label: 'Frequency', type: 'number', min: 20, max: 20000, default: 2000, unit: 'hz', curve: 'log' },
    { key: 'q', label: 'Q', type: 'number', min: 0.1, max: 30, step: 0.1, default: 1 },
    { key: 'gain', label: 'Gain', type: 'number', min: -24, max: 24, step: 0.5, default: 0, unit: 'db' },
  ],
  build(ctx, input, p, ec) {
    return todo('filter.build');
  },
};
