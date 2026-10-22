// Image files ⇄ RasterImage via sharp. See docs/cli.md#implementation-srccli.
import { mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import sharp from 'sharp';
import type { RasterImage } from '../core/types';

export const LOSSLESS_EXTENSIONS = ['.png', '.webp', '.tif', '.tiff'];
export const LOSSY_EXTENSIONS = ['.jpg', '.jpeg', '.avif'];

export function isLossy(path: string): boolean {
  return LOSSY_EXTENSIONS.includes(extname(path).toLowerCase());
}

export function isSupportedOutput(path: string): boolean {
  const ext = extname(path).toLowerCase();
  return LOSSLESS_EXTENSIONS.includes(ext) || LOSSY_EXTENSIONS.includes(ext);
}

/** Decode any sharp-supported file (incl. TIFF) to RGBA. */
export async function readImage(path: string): Promise<RasterImage> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

/** Encode by extension. Lossy formats throw unless `allowLossy`. WebP is written lossless. */
export async function writeImage(path: string, image: RasterImage, allowLossy: boolean): Promise<void> {
  const ext = extname(path).toLowerCase();
  if (isLossy(path) && !allowLossy) {
    throw new Error(`${ext} is lossy and would smear the bent bytes; use .png or pass --allow-lossy`);
  }
  const raw = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  let img = sharp(raw, { raw: { width: image.width, height: image.height, channels: 4 } });
  switch (ext) {
    case '.png': img = img.png(); break;
    case '.webp': img = img.webp({ lossless: true }); break;
    case '.tif':
    case '.tiff': img = img.tiff({ compression: 'lzw' }); break;
    case '.jpg':
    case '.jpeg': img = img.jpeg({ quality: 95 }); break;
    case '.avif': img = img.avif({ quality: 80 }); break;
    default: throw new Error(`unsupported output format "${ext}" (use .png, .webp, .tif)`);
  }
  await mkdir(dirname(path), { recursive: true });
  await img.toFile(path);
}
