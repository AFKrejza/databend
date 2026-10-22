import { statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import fg from 'fast-glob';
import { UsageError } from './args';

/** Expand globs ourselves (PowerShell doesn't). Throws if a pattern matches nothing. */
export async function expandInputs(patterns: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const pattern of patterns) {
    // fast-glob wants forward slashes; on Windows a backslash is a path separator, not an escape.
    const glob = process.platform === 'win32' ? pattern.replace(/\\/g, '/') : pattern;
    if (!fg.isDynamicPattern(glob)) {
      out.push(pattern);
      continue;
    }
    const matches = await fg(glob, { onlyFiles: true });
    if (matches.length === 0) throw new UsageError(`no files match "${pattern}"`);
    out.push(...matches.sort());
  }
  return out;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Output path for one input:
 * - no `-o` → `<name><suffix>.png` next to the input
 * - `-o` is a folder (ends in a slash, exists as one, or there are several inputs) → inside it
 * - otherwise → `-o` as given
 */
export function outputPathFor(input: string, out: string | null, multipleInputs: boolean, suffix = '-bent'): string {
  const name = `${basename(input, extname(input))}${suffix}.png`;
  if (out === null) return join(dirname(input), name);
  if (multipleInputs || /[\\/]$/.test(out) || isDirectory(out)) return join(out, name);
  return out;
}
