#!/usr/bin/env node
// databend CLI entry. See docs/cli.md.
import { parseCliArgs, UsageError, USAGE, type RenderOptions } from './args';
import { describeEffects } from './fxParse';
import { expandInputs } from './batch';
import { todo } from '../core/todo';

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
      console.error(`databend: ${err.message}\n\n${USAGE}`);
      return EXIT_USAGE;
    }
    throw err;
  }
}

/**
 * Build the recipe (file + flags), then render each input:
 * readImage → resolveSelection → render(nodePlatform) → writeImage (+ waveform).
 * A failed file is reported and skipped; the exit code is EXIT_FAILED if any failed.
 */
export async function runRender(opts: RenderOptions): Promise<number> {
  const inputs = await expandInputs(opts.inputs);
  return todo(`runRender (${inputs.length} inputs)`);
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err) => { console.error(err); process.exitCode = EXIT_FAILED; },
);
