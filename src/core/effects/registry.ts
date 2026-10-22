// All effects, in menu order. Adding an effect = one file + one line here.
import type { Effect, EffectInstance, Params } from './types';
import { echo } from './echo';
import { distortion } from './distortion';
import { wah } from './wah';
import { filter } from './filter';
import { reverb } from './reverb';
import { bitcrush } from './bitcrush';
import { reverse } from './reverse';
import { gain } from './gain';
import { normalize } from './normalize';
import { todo } from '../todo';

export const EFFECTS: readonly Effect[] = [echo, distortion, wah, filter, reverb, bitcrush, reverse, gain, normalize];

export function getEffect(id: string): Effect | undefined {
  return EFFECTS.find((e) => e.id === id);
}

export function defaultParams(effect: Effect): Params {
  return Object.fromEntries(effect.params.map((s) => [s.key, s.default]));
}

export interface ValidatedParams {
  params: Params;
  warnings: string[];
}

/**
 * Coerce and check raw params (from the CLI or a recipe) against the effect's ParamSpec.
 * Unknown keys throw. Out-of-range numbers are clamped with a warning, and missing keys get defaults.
 */
export function validateParams(effect: Effect, raw: Record<string, unknown>): ValidatedParams {
  return todo('validateParams');
}

/** New chain entry with a fresh uid and default (or given) params. */
export function createInstance(effectId: string, params?: Params): EffectInstance {
  return todo('createInstance');
}
