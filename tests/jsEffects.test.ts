import { describe, expect, it } from 'vitest';
import { EFFECTS, defaultParams, validateParams } from '../src/core/effects/registry';
import { bitcrush } from '../src/core/effects/bitcrush';
import { echo } from '../src/core/effects/echo';
import { gain } from '../src/core/effects/gain';
import { normalize } from '../src/core/effects/normalize';
import { reverse } from '../src/core/effects/reverse';
import { ctx, noise } from './helpers';

describe('JS effects', () => {
  it('echo: impulse + 10 px delay → spike at sample 30 with height mix', () => {
    const x = new Float32Array(200);
    x[0] = 1;
    const y = echo.process(x, { time: 10, unit: 'px', feedback: 0.5, mix: 0.5 }, ctx());
    expect(y[0]).toBeCloseTo(0.5);
    expect(y[30]).toBeCloseTo(0.5);
    expect(y[60]).toBeCloseTo(0.25);
    expect(y[29]).toBe(0);
  });

  it('echo: rows unit uses rowLength', () => {
    const x = new Float32Array(1000);
    x[0] = 1;
    const y = echo.process(x, { time: 2, unit: 'rows', feedback: 0, mix: 1 }, ctx({ rowLength: 100 }));
    expect(y[200]).toBeCloseTo(1);
  });

  it('bitcrush quantises to the given bit depth', () => {
    const y = bitcrush.process(Float32Array.from([0.3, -0.3, 0.9]), { bits: 2, hold: 1 }, ctx());
    expect(Array.from(y)).toEqual([0.5, -0.5, 1]);
  });

  it('bitcrush hold repeats each channel for hold px', () => {
    const x = Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
    const y = bitcrush.process(x, { bits: 16, hold: 2 }, ctx());
    // Pixel 1 copies pixel 0 channel-wise; pixel 2 starts a new block.
    expect(Array.from(y).map((v) => +v.toFixed(3))).toEqual([0.1, 0.2, 0.3, 0.1, 0.2, 0.3, 0.7, 0.8, 0.9]);
  });

  it('reverse reverses', () => {
    expect(Array.from(reverse.process(Float32Array.from([1, 2, 3]), {}, ctx()))).toEqual([3, 2, 1]);
  });

  it('gain applies dB, invert and offset', () => {
    const y = gain.process(Float32Array.from([0.25]), { gain: 6.0206, invert: true, offset: 0.1 }, ctx());
    expect(y[0]).toBeCloseTo(-0.4, 3);
  });

  it('normalize hits the target peak', () => {
    const y = normalize.process(Float32Array.from([0.1, -0.2, 0.05]), { target: 0 }, ctx());
    expect(Math.max(...Array.from(y).map(Math.abs))).toBeCloseTo(1);
    expect(normalize.process(new Float32Array(3), { target: 0 }, ctx())).toEqual(new Float32Array(3));
  });

  it('every JS effect keeps the length and is deterministic', () => {
    for (const effect of EFFECTS) {
      if (effect.kind !== 'js') continue;
      const p = defaultParams(effect);
      const a = effect.process(noise(1000), p, ctx());
      const b = effect.process(noise(1000), p, ctx());
      expect(a.length, effect.id).toBe(1000);
      expect(a, effect.id).toEqual(b);
    }
  });
});

describe('validateParams', () => {
  it('coerces strings, clamps with a warning, fills defaults', () => {
    const { params, warnings } = validateParams(echo, { time: '30', feedback: 2 });
    expect(params).toEqual({ time: 30, unit: 'px', feedback: 0.95, mix: 0.5 });
    expect(warnings).toHaveLength(1);
    expect(validateParams(gain, { invert: 'on' }).params.invert).toBe(true);
  });

  it('throws on unknown params and bad values', () => {
    expect(() => validateParams(echo, { tiem: 3 })).toThrow(/unknown param "tiem"/);
    expect(() => validateParams(echo, { time: 'abc' })).toThrow(/number/);
    expect(() => validateParams(echo, { unit: 'cm' })).toThrow(/px \| rows/);
  });
});
