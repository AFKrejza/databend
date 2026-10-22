import type { RecipeStep } from '../core/recipe';
import { todo } from '../core/todo';

/**
 * `"echo time=30 unit=rows"` → `{ effect: 'echo', params: { time: 30, unit: 'rows' } }`.
 * Values are coerced using the effect's ParamSpec (number/select/bool) and validated.
 */
export function parseFx(text: string): RecipeStep {
  return todo('parseFx');
}

/** Text for `databend effects` (all) or `databend effects <id>` (params, ranges, defaults). */
export function describeEffects(effectId: string | null): string {
  return todo('describeEffects');
}
