// Browser image I/O: File → RasterImage, proxy, PNG export.
import type { RasterImage } from '../core/types';
import { todo } from '../core/todo';

export const PROXY_MAX_SIDE = 1024;

/** createImageBitmap → canvas → getImageData. */
export async function decodeFile(file: Blob): Promise<RasterImage> {
  return todo('decodeFile');
}

/** Downscaled copy when max(W, H) > maxSide, else null. scale = maxSide / max(W, H). */
export function makeProxy(image: RasterImage, maxSide = PROXY_MAX_SIDE): { proxy: RasterImage; scale: number } | null {
  return todo('makeProxy');
}

export function toImageData(image: RasterImage): ImageData {
  return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}

export async function encodePng(image: RasterImage): Promise<Blob> {
  return todo('encodePng');
}

export function downloadBlob(blob: Blob, filename: string): void {
  todo('downloadBlob');
}

/** "cat.jpg" → "cat-bent.png" */
export function bentName(original: string, ext = 'png'): string {
  const base = original.replace(/\.[^.]+$/, '');
  return `${base}-bent.${ext}`;
}
