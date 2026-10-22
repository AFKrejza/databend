#!/usr/bin/env node
// databend CLI entry. See docs/cli.md.
import { readFile } from 'node:fs/promises';
import { parseCliArgs, UsageError, USAGE, type RenderOptions } from './args';
import { describeEffects, parseFx } from './fxParse';
import { expandInputs, outputPathFor } from './batch';
import { isLossy, isSupportedOutput, readImage, writeImage } from './imageIO';
import { writeWaveformPng } from './waveformPng';
import { nodePlatform } from './nodePlatform';
import {
  defaultRecipe, mergeRecipe, parseRecipe, recipeToChain, resolveSelection, serializeRecipe,
  type Recipe, type RecipeOverrides,
} from '../core/recipe';
import { render } from '../core/engine/render';
import { OffsetCache } from '../core/engine/offsetCache';
import { baseStreamLength } from '../core/stream/offsets';

export const EXIT_OK = 0;
export const EXIT_USAGE = 1;
export const EXIT_FAILED = 2;

export async function main(argv: string[]): Promise<number> {
  try {
    const cmd = parseCliArgs(argv);
    switch (cmd.command) {
      case 'help':
        console.log(USAGE);
        return EXIT_OK;
      case 'effects':
        console.log(describeEffects(cmd.effectId));
        return EXIT_OK;
      case 'render':
        return await runRender(cmd);
    }
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`databend: ${err.message}\n\nRun "databend --help" for usage.`);
      return EXIT_USAGE;
    }
    throw err;
  }
}

/** Recipe file (if any) with command-line flags on top. */
export async function buildRecipe(opts: RenderOptions): Promise<{ recipe: Recipe; warnings: string[] }> {
  const warnings: string[] = [];
  let recipe = defaultRecipe();
  if (opts.recipe) {
    let json: unknown;
    try {
      json = JSON.parse(await readFile(opts.recipe, 'utf8'));
    } catch (err) {
      throw new UsageError(`can't read recipe "${opts.recipe}": ${err instanceof Error ? err.message : err}`);
    }
    try {
      const parsed = parseRecipe(json);
      recipe = parsed.recipe;
      warnings.push(...parsed.warnings);
    } catch (err) {
      throw new UsageError(`${opts.recipe}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const overrides: RecipeOverrides = { settings: {} };
  if (opts.encoding) overrides.settings!.encoding = opts.encoding;
  if (opts.layout) overrides.settings!.layout = opts.layout;
  if (opts.scan) overrides.settings!.scan = opts.scan;
  if (opts.rect) overrides.rect = opts.rect;
  if (opts.range) overrides.range = opts.range;
  if (opts.seed !== null) overrides.seed = opts.seed;
  if (opts.fx.length > 0) {
    overrides.chain = opts.fx.map((text) => {
      const { step, warnings: w } = parseFx(text);
      warnings.push(...w);
      return step;
    });
  }
  return { recipe: mergeRecipe(recipe, overrides), warnings };
}

/**
 * Build the recipe (file + flags), then render each input:
 * readImage → resolveSelection → render(nodePlatform) → writeImage (+ waveform).
 * A failed file is reported and skipped; the exit code is EXIT_FAILED if any failed.
 */
export async function runRender(opts: RenderOptions): Promise<number> {
  const log = opts.quiet ? () => {} : (msg: string) => console.log(msg);
  const inputs = await expandInputs(opts.inputs);
  const multiple = inputs.length > 1;
  if (!multiple && opts.out && !/[\\/]$/.test(opts.out)) {
    const out = outputPathFor(inputs[0], opts.out, false);
    if (!isSupportedOutput(out)) throw new UsageError(`unsupported output format "${out}" (use .png, .webp, .tif)`);
    if (isLossy(out) && !opts.allowLossy) throw new UsageError(`${out} is lossy; use .png or pass --allow-lossy`);
  }

  const { recipe, warnings } = await buildRecipe(opts);
  for (const w of warnings) console.warn(`warning: ${w}`);
  const chain = recipeToChain(recipe);

  if (opts.dryRun) {
    console.log(serializeRecipe(recipe));
    for (const input of inputs) {
      const img = await readImage(input);
      const sel = resolveSelection(recipe.selection, img.width, img.height, recipe.settings);
      const n = baseStreamLength(img.width, img.height, sel.rect, recipe.settings);
      log(`${input}: ${img.width}×${img.height}, ${n.toLocaleString()} stream bytes → ${outputPathFor(input, opts.out, multiple)}`);
    }
    return EXIT_OK;
  }

  const cache = new OffsetCache();
  let failed = 0;
  for (const input of inputs) {
    try {
      const source = await readImage(input);
      const selection = resolveSelection(recipe.selection, source.width, source.height, recipe.settings);
      const result = await render(
        { source, scale: 1, settings: recipe.settings, selection, chain, seed: recipe.seed },
        nodePlatform, cache,
      );
      for (const [uid, msg] of Object.entries(result.errors)) console.warn(`warning: ${input}: ${uid} skipped: ${msg}`);

      const out = outputPathFor(input, opts.out, multiple);
      await writeImage(out, result.image, opts.allowLossy);
      if (opts.waveform) {
        await writeWaveformPng(outputPathFor(input, opts.waveform, multiple, '-wave'), result.before, result.after);
      }
      const mp = ((source.width * source.height) / 1e6).toFixed(1);
      log(`${input} → ${out} (${mp} MP, ${result.ms.toFixed(0)} ms)`);
    } catch (err) {
      failed++;
      console.error(`error: ${input}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return failed > 0 ? EXIT_FAILED : EXIT_OK;
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err) => { console.error(err); process.exitCode = EXIT_FAILED; },
);
