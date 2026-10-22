import { todo } from '../core/todo';

/** Draw before (grey) and after (accent) peaks into an RGBA buffer and save it as PNG. */
export async function writeWaveformPng(
  path: string, before: Float32Array, after: Float32Array, width = 1600, height = 300,
): Promise<void> {
  return todo('writeWaveformPng');
}
