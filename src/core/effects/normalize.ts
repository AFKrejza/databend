import type { JsEffect } from './types';
import { dbToGain } from './units';

/** Scale so the peak reaches `target` dB. */
export const normalize: JsEffect = {
  kind: 'js',
  id: 'normalize',
  name: 'Normalize',
  params: [
    { key: 'target', label: 'Peak', type: 'number', min: -12, max: 0, step: 0.5, default: -1, unit: 'db' },
  ],
  process(x, p) {
    let peak = 0;
    for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
    if (peak === 0) return x;
    const g = dbToGain(Number(p.target)) / peak;
    for (let i = 0; i < x.length; i++) x[i] *= g;
    return x;
  },
};
