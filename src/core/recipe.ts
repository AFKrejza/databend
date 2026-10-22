// Recipe JSON shared by the GUI (save/load) and the CLI (-r). See docs/cli.md#recipes-shared-with-the-gui.
import {
  DEFAULT_SETTINGS, ENCODINGS, LAYOUTS, SCANS,
  type Rect, type Selection, type Settings,
} from './types';
import type { EffectInstance, Params } from './effects/types';
import { createInstance, defaultParams, getEffect, validateParams } from './effects/registry';
import { baseStreamLength } from './stream/offsets';

export const RECIPE_VERSION = 1;

export interface RecipeStep {
  effect: string;
  params: Params;
  bypass?: boolean;
}

/** Fractions (0–1 of the base stream) let one recipe fit any image size. */
export interface RecipeRange {
  start: number;
  end: number;
  unit: 'fraction' | 'samples';
}

export interface RecipeSelection {
  rect: Rect | null;
  range: RecipeRange | null;
}

export interface Recipe {
  version: number;
  settings: Settings;
  selection: RecipeSelection;
  chain: RecipeStep[];
  seed: number;
}

export function defaultRecipe(): Recipe {
  return {
    version: RECIPE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    selection: { rect: null, range: null },
    chain: [],
    seed: 1,
  };
}

/** Clip the rect to the image and turn a fractional range into stream positions. */
export function resolveSelection(sel: RecipeSelection, width: number, height: number, settings: Settings): Selection {
  if (!sel.range) return { rect: sel.rect, range: null };
  if (sel.range.unit === 'samples') return { rect: sel.rect, range: { start: sel.range.start, end: sel.range.end } };
  const n = baseStreamLength(width, height, sel.rect, settings);
  return {
    rect: sel.rect,
    range: { start: Math.round(sel.range.start * n), end: Math.round(sel.range.end * n) },
  };
}

export interface ParsedRecipe {
  recipe: Recipe;
  warnings: string[];
}

/** Validate unknown JSON. Fills defaults, clamps params (warning), and throws on unknown effects/params. */
export function parseRecipe(json: unknown): ParsedRecipe {
  const warnings: string[] = [];
  const obj = asObject(json, 'recipe');
  const recipe = defaultRecipe();

  if (obj.version !== undefined) {
    if (typeof obj.version !== 'number' || obj.version > RECIPE_VERSION) {
      throw new Error(`recipe: unsupported version ${String(obj.version)} (this app reads up to ${RECIPE_VERSION})`);
    }
  }

  if (obj.settings !== undefined) {
    const s = asObject(obj.settings, 'settings');
    recipe.settings = {
      encoding: oneOf(s.encoding, ENCODINGS, 'settings.encoding', DEFAULT_SETTINGS.encoding),
      layout: oneOf(s.layout, LAYOUTS, 'settings.layout', DEFAULT_SETTINGS.layout),
      scan: oneOf(s.scan, SCANS, 'settings.scan', DEFAULT_SETTINGS.scan),
    };
  }

  if (obj.selection !== undefined && obj.selection !== null) {
    const sel = asObject(obj.selection, 'selection');
    recipe.selection = { rect: parseRectJson(sel.rect), range: parseRangeJson(sel.range) };
  }

  if (obj.chain !== undefined) {
    if (!Array.isArray(obj.chain)) throw new Error('recipe: chain must be an array');
    recipe.chain = obj.chain.map((raw, i) => {
      const step = asObject(raw, `chain[${i}]`);
      const effect = getEffect(String(step.effect));
      if (!effect) throw new Error(`recipe: chain[${i}]: unknown effect "${String(step.effect)}"`);
      const params = step.params === undefined ? {} : asObject(step.params, `chain[${i}].params`);
      const v = validateParams(effect, params);
      warnings.push(...v.warnings);
      return { effect: effect.id, params: v.params, bypass: step.bypass === true };
    });
  }

  if (obj.seed !== undefined) {
    if (!Number.isInteger(obj.seed)) throw new Error('recipe: seed must be an integer');
    recipe.seed = obj.seed as number;
  }

  return { recipe, warnings };
}

export function serializeRecipe(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2);
}

export interface RecipeOverrides {
  settings?: Partial<Settings>;
  rect?: Rect;
  range?: RecipeRange;
  /** Replaces the recipe's chain when given. */
  chain?: RecipeStep[];
  seed?: number;
}

/** Used for "recipe file + command-line flags": anything given in `overrides` wins. */
export function mergeRecipe(base: Recipe, overrides: RecipeOverrides): Recipe {
  return {
    version: base.version,
    settings: { ...base.settings, ...overrides.settings },
    selection: {
      rect: overrides.rect ?? base.selection.rect,
      range: overrides.range ?? base.selection.range,
    },
    chain: overrides.chain ?? base.chain,
    seed: overrides.seed ?? base.seed,
  };
}

export function recipeToChain(recipe: Recipe): EffectInstance[] {
  return recipe.chain.map((step) => ({ ...createInstance(step.effect, step.params), bypass: step.bypass === true }));
}

export function chainToRecipeSteps(chain: EffectInstance[]): RecipeStep[] {
  return chain.map((inst) => ({ effect: inst.effectId, params: { ...inst.params }, bypass: inst.bypass }));
}

/** The equivalent `databend <input> -e ... -f "..."` command (GUI "Copy CLI command"). */
export function recipeToCliCommand(recipe: Recipe, inputName: string): string {
  const { settings, selection } = recipe;
  const parts = ['databend', quote(inputName)];
  if (settings.encoding !== DEFAULT_SETTINGS.encoding) parts.push('-e', settings.encoding);
  if (settings.layout !== DEFAULT_SETTINGS.layout) parts.push('-l', settings.layout);
  if (settings.scan !== DEFAULT_SETTINGS.scan) parts.push('-s', settings.scan);
  if (selection.rect) {
    const r = selection.rect;
    parts.push('--rect', [r.x, r.y, r.w, r.h].map(Math.round).join(','));
  }
  if (selection.range) {
    const { start, end, unit } = selection.range;
    parts.push('--range', unit === 'fraction' ? `${fraction(start)}:${fraction(end)}` : `${start}:${end}`);
  }
  for (const step of recipe.chain) {
    if (step.bypass) continue;
    const effect = getEffect(step.effect);
    const defaults = effect ? defaultParams(effect) : {};
    const changed = Object.entries(step.params).filter(([k, v]) => defaults[k] !== v);
    parts.push('-f', `"${[step.effect, ...changed.map(([k, v]) => `${k}=${v}`)].join(' ')}"`);
  }
  if (recipe.seed !== 1) parts.push('--seed', String(recipe.seed));
  return parts.join(' ');
}

/** Always has a decimal point, so the CLI reads it back as a fraction. */
function fraction(v: number): string {
  const s = String(Number(v.toFixed(6)));
  return s.includes('.') ? s : `${s}.0`;
}

function quote(s: string): string {
  return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function asObject(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`recipe: ${what} must be an object`);
  return v as Record<string, unknown>;
}

function oneOf<T extends string>(v: unknown, options: readonly T[], what: string, fallback: T): T {
  if (v === undefined) return fallback;
  if (!options.includes(v as T)) throw new Error(`recipe: ${what} must be one of ${options.join(' | ')}`);
  return v as T;
}

function parseRectJson(v: unknown): Rect | null {
  if (v === undefined || v === null) return null;
  const r = asObject(v, 'selection.rect');
  const nums = [r.x, r.y, r.w, r.h];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    throw new Error('recipe: selection.rect needs numeric x, y, w, h');
  }
  return { x: r.x as number, y: r.y as number, w: r.w as number, h: r.h as number };
}

function parseRangeJson(v: unknown): RecipeRange | null {
  if (v === undefined || v === null) return null;
  const r = asObject(v, 'selection.range');
  if (typeof r.start !== 'number' || typeof r.end !== 'number') {
    throw new Error('recipe: selection.range needs numeric start and end');
  }
  const unit = r.unit ?? (r.start <= 1 && r.end <= 1 ? 'fraction' : 'samples');
  if (unit !== 'fraction' && unit !== 'samples') throw new Error('recipe: selection.range.unit must be fraction | samples');
  return { start: r.start, end: r.end, unit };
}
