import type { WebAudioEffect } from './types';
import { todo } from '../todo';

export type CurveType = 'tanh' | 'hard' | 'foldback' | 'fuzz';

/** 4096-point WaveShaper curve. Cached by type. */
export function makeCurve(type: CurveType, points = 4096): Float32Array {
  return todo('makeCurve');
}

/** pre-gain → WaveShaper → post-gain → dry/wet. See docs/effects.md#distortion-distortionts-webaudio. */
export const distortion: WebAudioEffect = {
  kind: 'webaudio',
  id: 'distortion',
  name: 'Distortion',
  params: [
    { key: 'drive', label: 'Drive', type: 'number', min: 1, max: 100, default: 5, unit: 'x', curve: 'log' },
    {
      key: 'curve', label: 'Curve', type: 'select', default: 'tanh',
      options: [
        { value: 'tanh', label: 'tanh' },
        { value: 'hard', label: 'Hard clip' },
        { value: 'foldback', label: 'Foldback' },
        { value: 'fuzz', label: 'Fuzz' },
      ],
    },
    {
      key: 'oversample', label: 'Oversample', type: 'select', default: 'none',
      options: [{ value: 'none', label: 'None' }, { value: '2x', label: '2x' }, { value: '4x', label: '4x' }],
    },
    { key: 'output', label: 'Output', type: 'number', min: -24, max: 0, step: 0.5, default: -3, unit: 'db' },
    { key: 'mix', label: 'Mix', type: 'number', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  build(ctx, input, p, ec) {
    return todo('distortion.build');
  },
};
