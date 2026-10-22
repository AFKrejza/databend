import { todo } from '../core/todo';

/** Expand globs ourselves (PowerShell doesn't). Throws if nothing matches. */
export async function expandInputs(patterns: string[]): Promise<string[]> {
  return todo('expandInputs');
}

/**
 * Output path for one input:
 * - no `-o` → `<name>-bent.png` next to the input
 * - `-o` is a folder (or there are several inputs) → `<out>/<name>-bent.png`
 * - otherwise → `-o` as given
 */
export function outputPathFor(input: string, out: string | null, multipleInputs: boolean): string {
  return todo('outputPathFor');
}
