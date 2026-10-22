import type { JsEffect } from './types';
import { lengthToSamples } from './units';
import { mixArrays } from './mix';

/**
 * Feedback delay mixed with the dry signal. Plain JS rather than Web Audio: a DelayNode inside
 * a feedback loop is clamped to ≥ 128 samples, which would break short echoes.
 * See docs/effects.md#echo--delay-echots-js.
 */
export const echo: JsEffect = {
  kind: 'js',
  id: 'echo',
  name: 'Echo / Delay',
  params: [
    { key: 'time', label: 'Time', type: 'number', min: 1, max: 2000, step: 1, default: 40 },
    {
      key: 'unit', label: 'Unit', type: 'select', default: 'px',
      options: [{ value: 'px', label: 'px' }, { value: 'rows', label: 'rows' }],
    },
    { key: 'feedback', label: 'Feedback', type: 'number', min: 0, max: 0.95, step: 0.01, default: 0.4 },
    { key: 'mix', label: 'Mix', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
  ],
  process(x, p, ec) {
    const d = lengthToSamples(Number(p.time), p.unit === 'rows' ? 'rows' : 'px', ec);
    const fb = Number(p.feedback);
    // wet[i] = x[i - d] + fb · wet[i - d]
    const wet = new Float32Array(x.length);
    for (let i = d; i < x.length; i++) wet[i] = x[i - d] + fb * wet[i - d];
    return mixArrays(x, wet, Number(p.mix));
  },
};
