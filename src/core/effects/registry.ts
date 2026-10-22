// All effects, in menu order. Adding an effect = one file + one line here.
import type { Effect, EffectInstance, ParamValue, Params } from './types';
import { echo } from './echo';
import { distortion } from './distortion';
import { wah } from './wah';
import { filter } from './filter';
import { reverb } from './reverb';
import { bitcrush } from './bitcrush';
import { reverse } from './reverse';
import { gain } from './gain';
import { normalize } from './normalize';

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

const TRUE_WORDS = ['true', '1', 'on', 'yes'];
const FALSE_WORDS = ['false', '0', 'off', 'no'];

/**
 * Coerce and check raw params (from the CLI or a recipe) against the effect's ParamSpec.
 * Unknown keys and bad values throw. Out-of-range numbers are clamped with a warning,
 * and missing keys get defaults.
 */
export function validateParams(effect: Effect, raw: Record<string, unknown>): ValidatedParams {
  const warnings: string[] = [];
  const known = new Set(effect.params.map((s) => s.key));
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      const list = effect.params.map((s) => s.key).join(', ') || 'none';
      throw new Error(`${effect.id}: unknown param "${key}" (params: ${list})`);
    }
  }
  const params: Params = {};
  for (const spec of effect.params) {
    const v = raw[spec.key];
    if (v === undefined) {
      params[spec.key] = spec.default;
      continue;
    }
    let value: ParamValue;
    switch (spec.type) {
      case 'number': {
        const n = typeof v === 'number' ? v : Number(v);
        if (typeof v === 'boolean' || !Number.isFinite(n)) {
          throw new Error(`${effect.id}: ${spec.key} must be a number, got "${String(v)}"`);
        }
        value = Math.min(spec.max, Math.max(spec.min, n));
        if (value !== n) warnings.push(`${effect.id}: ${spec.key}=${n} clamped to ${value}`);
        break;
      }
      case 'select': {
        value = String(v);
        if (!spec.options.some((o) => o.value === value)) {
          const list = spec.options.map((o) => o.value).join(' | ');
          throw new Error(`${effect.id}: ${spec.key} must be one of ${list}, got "${value}"`);
        }
        break;
      }
      case 'bool': {
        if (typeof v === 'boolean') value = v;
        else if (TRUE_WORDS.includes(String(v).toLowerCase())) value = true;
        else if (FALSE_WORDS.includes(String(v).toLowerCase())) value = false;
        else throw new Error(`${effect.id}: ${spec.key} must be true or false, got "${String(v)}"`);
        break;
      }
    }
    params[spec.key] = value;
  }
  return { params, warnings };
}

let nextUid = 1;

/** New chain entry with a fresh uid and default (or given) params. */
export function createInstance(effectId: string, params?: Params): EffectInstance {
  const effect = getEffect(effectId);
  if (!effect) throw new Error(`Unknown effect "${effectId}"`);
  return {
    uid: `${effectId}-${nextUid++}`,
    effectId,
    params: { ...defaultParams(effect), ...params },
    bypass: false,
  };
}
