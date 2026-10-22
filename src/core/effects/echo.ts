import type { WebAudioEffect } from './types';
import { todo } from '../todo';

/** DelayNode with a feedback loop, mixed with the dry signal. See docs/effects.md#echo--delay-echots-webaudio. */
export const echo: WebAudioEffect = {
  kind: 'webaudio',
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
  build(ctx, input, p, ec) {
    return todo('echo.build');
  },
};
