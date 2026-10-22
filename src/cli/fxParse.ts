import type { RecipeStep } from '../core/recipe';
import { EFFECTS, getEffect, validateParams } from '../core/effects/registry';
import type { ParamSpec } from '../core/effects/types';
import { UsageError } from './args';

/**
 * `"echo time=30 unit=rows"` → `{ effect: 'echo', params: { time: 30, unit: 'rows', ... } }`.
 * Values are coerced using the effect's ParamSpec (number/select/bool) and validated.
 */
export function parseFx(text: string): { step: RecipeStep; warnings: string[] } {
  const [id, ...pairs] = text.trim().split(/\s+/);
  if (!id) throw new UsageError('-f needs an effect, e.g. -f "echo time=30"');
  const effect = getEffect(id);
  if (!effect) {
    throw new UsageError(`unknown effect "${id}" (effects: ${EFFECTS.map((e) => e.id).join(', ')})`);
  }
  const raw: Record<string, string> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq <= 0) throw new UsageError(`-f "${text}": expected key=value, got "${pair}"`);
    raw[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  try {
    const { params, warnings } = validateParams(effect, raw);
    return { step: { effect: id, params }, warnings };
  } catch (err) {
    throw new UsageError(err instanceof Error ? err.message : String(err));
  }
}

function describeParam(spec: ParamSpec): string {
  switch (spec.type) {
    case 'number': {
      const unit = spec.unit ? ` ${spec.unit}` : '';
      return `${spec.key.padEnd(12)} ${spec.min} – ${spec.max}${unit}`.padEnd(36) + `default ${spec.default}`;
    }
    case 'select':
      return `${spec.key.padEnd(12)} ${spec.options.map((o) => o.value).join(' | ')}`.padEnd(36) + `default ${spec.default}`;
    case 'bool':
      return `${spec.key.padEnd(12)} true | false`.padEnd(36) + `default ${spec.default}`;
  }
}

/** Text for `databend effects` (all) or `databend effects <id>` (params, ranges, defaults). */
export function describeEffects(effectId: string | null): string {
  if (effectId === null) {
    const lines = EFFECTS.map((e) => `  ${e.id.padEnd(12)} ${e.name}`);
    return `effects (use "databend effects <id>" for params):\n${lines.join('\n')}`;
  }
  const effect = getEffect(effectId);
  if (!effect) throw new UsageError(`unknown effect "${effectId}" (effects: ${EFFECTS.map((e) => e.id).join(', ')})`);
  const params = effect.params.length ? effect.params.map((s) => `  ${describeParam(s)}`).join('\n') : '  (no params)';
  return `${effect.id}: ${effect.name}\n${params}`;
}
