// Command-line parsing with node:util parseArgs. See docs/cli.md#usage.
import type { Encoding, Layout, Rect, Scan } from '../core/types';
import type { RecipeRange } from '../core/recipe';
import { todo } from '../core/todo';

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
  return todo('parseCliArgs');
}

/** "x,y,w,h" */
export function parseRect(text: string): Rect {
  return todo('parseRect');
}

/** "start:end", as fractions if both are ≤ 1 and either has a decimal point, otherwise sample indices. */
export function parseRange(text: string): RecipeRange {
  return todo('parseRange');
}

export const USAGE = `databend <input...> [options]
databend effects [id]

  -o, --out <path>        output file, or folder for several inputs
  -e, --encoding <enc>    mulaw | alaw | u8 | s8 | s16be | s16le   (default mulaw)
  -l, --layout <layout>   interleaved | planar | r | g | b         (default interleaved)
  -s, --scan <scan>       rows | columns                           (default rows)
      --rect <x,y,w,h>    rectangle selection in pixels
      --range <a:b>       range in the base stream (samples, or fractions like 0.25:0.5)
  -f, --fx "<id> k=v"     add an effect (repeatable, runs in order)
  -r, --recipe <file>     load a recipe; flags override it
      --seed <n>          seed for random effects (default 1)
      --waveform <png>    also save a before/after waveform image
      --allow-lossy       allow JPEG/AVIF output
      --dry-run           print the resolved recipe, don't render
  -q, --quiet             only print errors
  -h, --help`;
