import type { JsEffect } from './types';

/**
 * Quantise to `bits`, and hold each channel's value for `hold` pixels (horizontal pixelation).
 * hold = 1 means no hold. See docs/effects.md#bitcrush-bitcrushts-js.
 */
export const bitcrush: JsEffect = {
  kind: 'js',
  id: 'bitcrush',
  name: 'Bitcrush',
  params: [
    { key: 'bits', label: 'Bits', type: 'number', min: 1, max: 16, step: 1, default: 4 },
    { key: 'hold', label: 'Hold', type: 'number', min: 1, max: 64, step: 1, default: 1, unit: 'px' },
  ],
  process(x, p, ec) {
    const levels = Math.pow(2, Math.round(Number(p.bits)) - 1);
    // Hold per channel: sample i copies the same channel of the first pixel in its block.
    const stride = Math.max(1, Math.round(ec.samplesPerPixel));
    const block = Math.max(1, Math.round(Number(p.hold) * ec.scale)) * stride;
    for (let i = 0; i < x.length; i++) {
      const src = block > stride ? i - (i % block) + (i % stride) : i;
      x[i] = Math.round(x[src] * levels) / levels;
    }
    return x;
  },
};
