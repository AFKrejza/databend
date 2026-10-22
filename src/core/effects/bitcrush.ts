import type { JsEffect } from './types';
import { todo } from '../todo';

/** Quantise to `bits` and sample-and-hold for `hold` px. See docs/effects.md#bitcrush-bitcrushts-js. */
export const bitcrush: JsEffect = {
  kind: 'js',
  id: 'bitcrush',
  name: 'Bitcrush',
  params: [
    { key: 'bits', label: 'Bits', type: 'number', min: 1, max: 16, step: 1, default: 4 },
    { key: 'hold', label: 'Hold', type: 'number', min: 1, max: 64, step: 1, default: 1, unit: 'px' },
  ],
  process(x, p, ec) {
    return todo('bitcrush.process');
  },
};
