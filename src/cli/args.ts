// Command-line parsing with node:util parseArgs. See docs/cli.md#usage.
import { parseArgs } from 'node:util';
import { ENCODINGS, LAYOUTS, SCANS, type Encoding, type Layout, type Rect, type Scan } from '../core/types';
import type { RecipeRange } from '../core/recipe';

export interface RenderOptions {
  command: 'render';
  inputs: string[];
  out: string | null;
  encoding: Encoding | null;
  layout: Layout | null;
  scan: Scan | null;
  rect: Rect | null;
  range: RecipeRange | null;
  /** Raw `-f` strings, parsed later against the registry by fxParse. */
  fx: string[];
  recipe: string | null;
  seed: number | null;
  waveform: string | null;
  allowLossy: boolean;
  dryRun: boolean;
  quiet: boolean;
}

export type CliCommand =
  | RenderOptions
  | { command: 'effects'; effectId: string | null }
  | { command: 'help' };

export class UsageError extends Error {}

/** Throws UsageError on bad flags or values. */
export function parseCliArgs(argv: string[]): CliCommand {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string', short: 'o' },
        encoding: { type: 'string', short: 'e' },
        layout: { type: 'string', short: 'l' },
        scan: { type: 'string', short: 's' },
        rect: { type: 'string' },
        range: { type: 'string' },
        fx: { type: 'string', short: 'f', multiple: true },
        recipe: { type: 'string', short: 'r' },
        seed: { type: 'string' },
        waveform: { type: 'string' },
        'allow-lossy': { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        quiet: { type: 'boolean', short: 'q' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    throw new UsageError(err instanceof Error ? err.message : String(err));
  }
  const { values: v, positionals } = parsed;

  if (v.help || positionals.length === 0) return { command: 'help' };
  if (positionals[0] === 'effects') {
    if (positionals.length > 2) throw new UsageError('usage: databend effects [id]');
    return { command: 'effects', effectId: positionals[1] ?? null };
  }

  let seed: number | null = null;
  if (v.seed !== undefined) {
    seed = Number(v.seed);
    if (!Number.isInteger(seed)) throw new UsageError(`--seed must be an integer, got "${v.seed}"`);
  }

  return {
    command: 'render',
    inputs: positionals,
    out: v.out ?? null,
    encoding: v.encoding === undefined ? null : oneOf(v.encoding, ENCODINGS, '--encoding'),
    layout: v.layout === undefined ? null : oneOf(v.layout, LAYOUTS, '--layout'),
    scan: v.scan === undefined ? null : oneOf(v.scan, SCANS, '--scan'),
    rect: v.rect === undefined ? null : parseRect(v.rect),
    range: v.range === undefined ? null : parseRange(v.range),
    fx: v.fx ?? [],
    recipe: v.recipe ?? null,
    seed,
    waveform: v.waveform ?? null,
    allowLossy: v['allow-lossy'] ?? false,
    dryRun: v['dry-run'] ?? false,
    quiet: v.quiet ?? false,
  };
}

function oneOf<T extends string>(value: string, options: readonly T[], flag: string): T {
  if (!options.includes(value as T)) throw new UsageError(`${flag} must be one of ${options.join(' | ')}, got "${value}"`);
  return value as T;
}

/** "x,y,w,h" */
export function parseRect(text: string): Rect {
  const nums = text.split(',').map((s) => Number(s.trim()));
  if (nums.length !== 4 || !nums.every(Number.isFinite) || nums[2] <= 0 || nums[3] <= 0) {
    throw new UsageError(`--rect must be x,y,w,h with positive w and h, got "${text}"`);
  }
  const [x, y, w, h] = nums;
  return { x, y, w, h };
}

/** "start:end", as fractions if both are ≤ 1 and either has a decimal point, otherwise stream positions. */
export function parseRange(text: string): RecipeRange {
  const parts = text.split(':');
  const nums = parts.map(Number);
  if (parts.length !== 2 || !nums.every(Number.isFinite) || nums.some((n) => n < 0) || nums[1] <= nums[0]) {
    throw new UsageError(`--range must be start:end with start < end, got "${text}"`);
  }
  const fraction = nums.every((n) => n <= 1) && parts.some((p) => p.includes('.'));
  if (!fraction && !nums.every(Number.isInteger)) {
    throw new UsageError(`--range: fractions must be ≤ 1, positions must be whole numbers, got "${text}"`);
  }
  return { start: nums[0], end: nums[1], unit: fraction ? 'fraction' : 'samples' };
}

export const USAGE = `databend <input...> [options]
databend effects [id]

  -o, --out <path>        output file, or folder for several inputs
  -e, --encoding <enc>    mulaw | alaw | u8 | s8 | s16be | s16le   (default mulaw)
  -l, --layout <layout>   interleaved | planar | r | g | b         (default interleaved)
  -s, --scan <scan>       rows | columns                           (default rows)
      --rect <x,y,w,h>    rectangle selection in pixels
      --range <a:b>       range in the base stream (byte positions, or fractions like 0.25:0.5)
  -f, --fx "<id> k=v"     add an effect (repeatable, runs in order; replaces a recipe's chain)
  -r, --recipe <file>     load a recipe; flags override it
      --seed <n>          seed for random effects (default 1)
      --waveform <png>    also save a before/after waveform image
      --allow-lossy       allow JPEG/AVIF output
      --dry-run           print the resolved recipe, don't render
  -q, --quiet             only print errors
  -h, --help

examples:
  databend cat.jpg -f "echo time=30 feedback=0.5"
  databend cat.jpg -s columns -f "echo time=20 unit=rows" -f "distortion drive=20 curve=foldback"
  databend photos/*.png -r look.json -o bent/`;
