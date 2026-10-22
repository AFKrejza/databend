import type { WebAudioEffect } from './types';
import { rowsToSamples, scaledHz } from './units';
import { dryWet } from './mix';

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
    const center = scaledHz(Number(p.center), ec);
    // Keep the sweep's low end above 20 Hz.
    const depth = Math.max(0, Math.min(Number(p.depth) / ec.scale, center - 20));

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = Number(p.q);
    filter.frequency.value = center;

    const lfo = ctx.createOscillator();
    lfo.type = p.shape as OscillatorType;
    lfo.frequency.value = ec.sampleRate / rowsToSamples(Number(p.period), ec);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = depth;
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();

    input.connect(filter);
    return dryWet(ctx, input, filter, Number(p.mix));
  },
};
