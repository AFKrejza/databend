// Image files ⇄ RasterImage via sharp. See docs/cli.md#implementation-srccli.
import type { RasterImage } from '../core/types';
import { todo } from '../core/todo';

export const LOSSLESS_EXTENSIONS = ['.png', '.webp', '.tif', '.tiff'] as const;
export const LOSSY_EXTENSIONS = ['.jpg', '.jpeg', '.avif'] as const;

/** Decode any sharp-supported file (incl. TIFF) to RGBA. */
export async function readImage(path: string): Promise<RasterImage> {
  return todo('readImage');
}

/** Encode by extension. Lossy formats throw unless `allowLossy`. WebP is written lossless. */
export async function writeImage(path: string, image: RasterImage, allowLossy: boolean): Promise<void> {
  return todo('writeImage');
}
