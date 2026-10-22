// Image-unit → sample conversions. See docs/effects.md#units.
import type { EffectContext } from './types';
import { todo } from '../todo';

/** round(px × samplesPerPixel × scale), at least 1. */
export function pxToSamples(px: number, ec: EffectContext): number {
  return todo('pxToSamples');
}

/** round(rows × rowLength). rowLength is already at proxy scale. */
export function rowsToSamples(rows: number, ec: EffectContext): number {
  return todo('rowsToSamples');
}

/** Hz are defined at full res: divide by scale on the proxy, clamp to Nyquist. */
export function scaledHz(hz: number, ec: EffectContext): number {
  return todo('scaledHz');
}

/** For params with a px/rows unit selector. */
export function lengthToSamples(value: number, unit: 'px' | 'rows', ec: EffectContext): number {
  return unit === 'rows' ? rowsToSamples(value, ec) : pxToSamples(value, ec);
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}
