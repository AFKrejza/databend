import { describe, expect, it } from 'vitest';
import { nodePlatform } from '../src/cli/nodePlatform';
import { EFFECTS, defaultParams } from '../src/core/effects/registry';
import { runWebAudioGroup } from '../src/core/engine/render';
import type { Params, WebAudioEffect } from '../src/core/effects/types';
import { ctx, noise } from './helpers';

// Runs in Node using node-web-audio-api as the platform (see docs/testing.md).
const webaudioEffects = EFFECTS.filter((e): e is WebAudioEffect => e.kind === 'webaudio');

function run(effect: WebAudioEffect, x: Float32Array, params: Params = {}, errors: Record<string, string> = {}) {
  const step = { uid: effect.id, effect, params: { ...defaultParams(effect), ...params } };
  return runWebAudioGroup(x, [step], ctx(), nodePlatform, errors);
}

/** Mean |x[i] - x[i-1]|: a rough measure of high-frequency energy. */
function roughness(x: Float32Array): number {
  let s = 0;
  for (let i = 1; i < x.length; i++) s += Math.abs(x[i] - x[i - 1]);
  return s / (x.length - 1);
}

describe('Web Audio effects', () => {
  it('filter: low-pass reduces high-frequency energy of noise', async () => {
    const x = noise(20000);
    const y = await run(webaudioEffects.find((e) => e.id === 'filter')!, x, { type: 'lowpass', frequency: 500 });
    expect(roughness(y)).toBeLessThan(roughness(x) * 0.2);
  });

  it('distortion with mix 0 is a pass-through', async () => {
    const x = noise(1000);
    const y = await run(webaudioEffects.find((e) => e.id === 'distortion')!, x, { mix: 0 });
    for (let i = 0; i < x.length; i++) expect(y[i]).toBeCloseTo(x[i], 5);
  });

  it.each([1, 128, 100_000])('every effect returns exactly n samples (n = %i)', async (n) => {
    for (const effect of webaudioEffects) {
      const errors: Record<string, string> = {};
      const y = await run(effect, noise(n), {}, errors);
      expect(errors, effect.id).toEqual({});
      expect(y.length, effect.id).toBe(n);
      expect(y.every(Number.isFinite), effect.id).toBe(true);
    }
  });

  it('seeded reverb is deterministic', async () => {
    const reverb = webaudioEffects.find((e) => e.id === 'reverb')!;
    const a = await run(reverb, noise(5000));
    const b = await run(reverb, noise(5000));
    expect(a).toEqual(b);
  });

  it('a throwing effect is skipped and reported', async () => {
    const broken: WebAudioEffect = {
      kind: 'webaudio', id: 'broken', name: 'Broken', params: [],
      build() { throw new Error('boom'); },
    };
    const errors: Record<string, string> = {};
    const x = noise(500);
    const y = await runWebAudioGroup(x, [{ uid: 'b1', effect: broken, params: {} }], ctx(), nodePlatform, errors);
    expect(errors).toEqual({ b1: 'boom' });
    for (let i = 0; i < x.length; i++) expect(y[i]).toBeCloseTo(x[i], 6);
  });
});
