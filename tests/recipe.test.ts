import { describe, expect, it } from 'vitest';
import {
  chainToRecipeSteps, defaultRecipe, mergeRecipe, parseRecipe, recipeToChain, recipeToCliCommand,
  resolveSelection, serializeRecipe, type Recipe,
} from '../src/core/recipe';
import { parseCliArgs, type RenderOptions } from '../src/cli/args';
import { DEFAULT_SETTINGS } from '../src/core/types';

const sample: Recipe = {
  version: 1,
  settings: { encoding: 'u8', layout: 'planar', scan: 'columns' },
  selection: { rect: { x: 10, y: 20, w: 30, h: 40 }, range: { start: 0.25, end: 0.5, unit: 'fraction' } },
  chain: [
    { effect: 'echo', params: { time: 30, unit: 'rows', feedback: 0.5, mix: 0.5 }, bypass: false },
    { effect: 'reverse', params: {}, bypass: true },
  ],
  seed: 7,
};

describe('recipe', () => {
  it('parse/serialize round-trip', () => {
    expect(parseRecipe(JSON.parse(serializeRecipe(sample))).recipe).toEqual(sample);
  });

  it('fills defaults for a minimal recipe', () => {
    const { recipe } = parseRecipe({ chain: [{ effect: 'echo', params: { time: 5 } }] });
    expect(recipe.settings).toEqual(DEFAULT_SETTINGS);
    expect(recipe.chain[0].params).toEqual({ time: 5, unit: 'px', feedback: 0.4, mix: 0.5 });
  });

  it('unknown effect or param throws', () => {
    expect(() => parseRecipe({ chain: [{ effect: 'flanger' }] })).toThrow(/unknown effect/);
    expect(() => parseRecipe({ chain: [{ effect: 'echo', params: { speed: 1 } }] })).toThrow(/unknown param/);
    expect(() => parseRecipe({ settings: { encoding: 'mp3' } })).toThrow(/encoding/);
    expect(() => parseRecipe({ version: 99 })).toThrow(/version/);
  });

  it('out-of-range values clamp with a warning', () => {
    const { recipe, warnings } = parseRecipe({ chain: [{ effect: 'echo', params: { feedback: 3 } }] });
    expect(recipe.chain[0].params.feedback).toBe(0.95);
    expect(warnings).toHaveLength(1);
  });

  it('fractional range resolves to stream positions for any image size', () => {
    const sel = { rect: null, range: { start: 0.25, end: 0.5, unit: 'fraction' as const } };
    expect(resolveSelection(sel, 10, 10, DEFAULT_SETTINGS).range).toEqual({ start: 75, end: 150 });
    expect(resolveSelection(sel, 20, 10, DEFAULT_SETTINGS).range).toEqual({ start: 150, end: 300 });
  });

  it('flags override recipe values (mergeRecipe)', () => {
    const merged = mergeRecipe(sample, { settings: { encoding: 'mulaw' }, chain: [], seed: 2 });
    expect(merged.settings).toEqual({ encoding: 'mulaw', layout: 'planar', scan: 'columns' });
    expect(merged.selection).toEqual(sample.selection);
    expect(merged.chain).toEqual([]);
    expect(merged.seed).toBe(2);
  });

  it('chain ⇄ recipe steps keep params and bypass', () => {
    expect(chainToRecipeSteps(recipeToChain(sample))).toEqual(sample.chain);
  });

  it('recipeToCliCommand produces args parseCliArgs accepts', () => {
    const cmd = recipeToCliCommand(sample, 'my cat.png');
    expect(cmd).toContain('-f "echo time=30 unit=rows feedback=0.5"');
    expect(cmd).not.toContain('reverse');
    // Split like a shell would: quoted strings stay together.
    const argv = [...cmd.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]).slice(1);
    const opts = parseCliArgs(argv) as RenderOptions;
    expect(opts.inputs).toEqual(['my cat.png']);
    expect(opts.encoding).toBe('u8');
    expect(opts.rect).toEqual(sample.selection.rect);
    expect(opts.range).toEqual(sample.selection.range);
    expect(opts.seed).toBe(7);
  });

  it('default recipe is valid', () => {
    expect(parseRecipe(defaultRecipe()).recipe).toEqual(defaultRecipe());
  });
});
