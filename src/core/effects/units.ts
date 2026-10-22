// Image-unit → sample conversions. See docs/effects.md#units.
import type { EffectContext } from './types';

/** round(px × samplesPerPixel × scale), at least 1. */
export function pxToSamples(px: number, ec: EffectContext): number {
  return Math.max(1, Math.round(px * ec.samplesPerPixel * ec.scale));
}

/** round(rows × rowLength), at least 1. rowLength is already at proxy scale. */
export function rowsToSamples(rows: number, ec: EffectContext): number {
  return Math.max(1, Math.round(rows * ec.rowLength));
}

/** Hz are defined at full res: divide by scale on the proxy, clamp below Nyquist. */
export function scaledHz(hz: number, ec: EffectContext): number {
  return Math.min(hz / ec.scale, ec.sampleRate * 0.499);
}

/** For params with a px/rows unit selector. */
export function lengthToSamples(value: number, unit: 'px' | 'rows', ec: EffectContext): number {
  return unit === 'rows' ? rowsToSamples(value, ec) : pxToSamples(value, ec);
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}
