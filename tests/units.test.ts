import { describe, expect, it } from 'vitest';
import { lengthToSamples, pxToSamples, rowsToSamples, scaledHz } from '../src/core/effects/units';
import { ctx } from './helpers';

describe('units', () => {
  it('px → samples at scale 1 and on the proxy', () => {
    expect(pxToSamples(30, ctx())).toBe(90);
    expect(pxToSamples(30, ctx({ scale: 0.5 }))).toBe(45);
    expect(pxToSamples(30, ctx({ samplesPerPixel: 1 }))).toBe(30);
    expect(pxToSamples(0.01, ctx())).toBe(1);
  });

  it('rows → samples uses rowLength', () => {
    expect(rowsToSamples(20, ctx())).toBe(6000);
    expect(lengthToSamples(2, 'rows', ctx())).toBe(600);
    expect(lengthToSamples(2, 'px', ctx())).toBe(6);
  });

  it('Hz scale on the proxy and clamp to Nyquist', () => {
    expect(scaledHz(1000, ctx())).toBe(1000);
    expect(scaledHz(1000, ctx({ scale: 0.5 }))).toBe(2000);
    expect(scaledHz(20000, ctx({ scale: 0.25 }))).toBeLessThan(22050);
  });
});
