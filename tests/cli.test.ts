import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { parseCliArgs, parseRange, parseRect, UsageError } from '../src/cli/args';
import { parseFx } from '../src/cli/fxParse';
import { outputPathFor } from '../src/cli/batch';

const run = promisify(execFile);
const TSX = join('node_modules', 'tsx', 'dist', 'cli.mjs');

/** Run the real CLI; resolves with the exit code instead of throwing. */
async function cli(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(process.execPath, [TSX, 'src/cli/main.ts', ...args]);
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code: number; stdout: string; stderr: string };
    return { code: e.code, stdout: e.stdout, stderr: e.stderr };
  }
}

describe('cli parsing', () => {
  it('parseFx coerces values using ParamSpec', () => {
    const { step } = parseFx('echo  time=30 unit=rows');
    expect(step).toEqual({ effect: 'echo', params: { time: 30, unit: 'rows', feedback: 0.4, mix: 0.5 } });
    expect(() => parseFx('echo time')).toThrow(UsageError);
    expect(() => parseFx('flanger')).toThrow(/unknown effect/);
  });

  it('parseRect / parseRange', () => {
    expect(parseRect('1,2,3,4')).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(() => parseRect('1,2,3')).toThrow(UsageError);
    expect(parseRange('0.25:0.5')).toEqual({ start: 0.25, end: 0.5, unit: 'fraction' });
    expect(parseRange('0:1.0')).toEqual({ start: 0, end: 1, unit: 'fraction' });
    expect(parseRange('100:900')).toEqual({ start: 100, end: 900, unit: 'samples' });
    expect(() => parseRange('5:2')).toThrow(UsageError);
  });

  it('parseCliArgs handles subcommands and bad values', () => {
    expect(parseCliArgs([])).toEqual({ command: 'help' });
    expect(parseCliArgs(['effects', 'wah'])).toEqual({ command: 'effects', effectId: 'wah' });
    expect(() => parseCliArgs(['a.png', '-e', 'mp3'])).toThrow(UsageError);
    expect(() => parseCliArgs(['a.png', '--bogus'])).toThrow(UsageError);
  });

  it('outputPathFor', () => {
    expect(outputPathFor(join('in', 'cat.jpg'), null, false)).toBe(join('in', 'cat-bent.png'));
    expect(outputPathFor('cat.jpg', 'x.png', false)).toBe('x.png');
    expect(outputPathFor('cat.jpg', 'outdir', true)).toBe(join('outdir', 'cat-bent.png'));
    expect(outputPathFor('cat.jpg', 'w/', false, '-wave')).toBe(join('w', 'cat-wave.png'));
  });
});

describe('cli end to end', () => {
  let dir: string;

  // Inputs live in their own folder so outputs written next to them don't match later globs.
  let input: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'databend-'));
    input = join(dir, 'in');
    await mkdir(input);
    const pixels = Buffer.alloc(32 * 16 * 3);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7) & 0xff;
    for (const name of ['a.png', 'b.png']) {
      await sharp(pixels, { raw: { width: 32, height: 16, channels: 3 } }).png().toFile(join(input, name));
    }
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('renders to an output of the same size', async () => {
    const out = join(dir, 'out.png');
    const r = await cli(join(input, 'a.png'), '-o', out, '-f', 'echo time=3', '-f', 'distortion');
    expect(r.code).toBe(0);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([32, 16]);
  }, 30_000);

  it('exit code 1 for bad args, 2 for unreadable input', async () => {
    expect((await cli(join(input, 'a.png'), '-f', 'echo nope=1')).code).toBe(1);
    expect((await cli(join(input, 'a.png'), '-o', join(dir, 'x.jpg'))).code).toBe(1);
    expect((await cli(join(input, 'missing.png'), '-o', join(dir, 'm.png'))).code).toBe(2);
  }, 30_000);

  it('batch mode with a glob names outputs <name>-bent.png in the out folder', async () => {
    const outDir = join(dir, 'batch');
    const r = await cli(join(input, '*.png'), '-o', outDir, '-f', 'reverse', '--waveform', outDir);
    expect(r.code).toBe(0);
    expect((await readdir(outDir)).sort()).toEqual(['a-bent.png', 'a-wave.png', 'b-bent.png', 'b-wave.png']);
  }, 30_000);

  it('applies a recipe, and --dry-run prints it without writing files', async () => {
    const recipe = join(dir, 'look.json');
    await writeFile(recipe, JSON.stringify({ settings: { scan: 'columns' }, chain: [{ effect: 'wah' }] }));
    const r = await cli(join(input, 'a.png'), '-r', recipe, '-o', join(dir, 'dry.png'), '--dry-run');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('"scan": "columns"');
    expect(r.stdout).toContain('"effect": "wah"');
    expect(await readdir(dir)).not.toContain('dry.png');
  }, 30_000);
});
