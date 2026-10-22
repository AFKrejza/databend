import type { JsEffect } from './types';
import { todo } from '../todo';

/** Scale so the peak reaches `target` dB. */
export const normalize: JsEffect = {
  kind: 'js',
  id: 'normalize',
  name: 'Normalize',
  params: [
    { key: 'target', label: 'Peak', type: 'number', min: -12, max: 0, step: 0.5, default: -1, unit: 'db' },
  ],
  process(x, p, ec) {
    return todo('normalize.process');
  },
};
