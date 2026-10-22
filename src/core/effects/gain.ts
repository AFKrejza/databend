import type { JsEffect } from './types';
import { todo } from '../todo';

/** Gain in dB, optional polarity invert, DC offset. */
export const gain: JsEffect = {
  kind: 'js',
  id: 'gain',
  name: 'Gain / Invert',
  params: [
    { key: 'gain', label: 'Gain', type: 'number', min: -24, max: 24, step: 0.5, default: 0, unit: 'db' },
    { key: 'invert', label: 'Invert', type: 'bool', default: false },
    { key: 'offset', label: 'DC offset', type: 'number', min: -1, max: 1, step: 0.01, default: 0 },
  ],
  process(x, p, ec) {
    return todo('gain.process');
  },
};
