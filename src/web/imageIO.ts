// Browser image I/O: File → RasterImage, proxy, PNG export.
import type { RasterImage } from '../core/types';

export const PROXY_MAX_SIDE = 1024;

function canvasFor(image: RasterImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.putImageData(toImageData(image), 0, 0);
  return canvas;
}

/** createImageBitmap → canvas → getImageData. */
export async function decodeFile(file: Blob): Promise<RasterImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width, height, data };
}

/** Downscaled copy when max(W, H) > maxSide, else null. */
export function makeProxy(image: RasterImage, maxSide = PROXY_MAX_SIDE): { proxy: RasterImage; scale: number } | null {
  const longest = Math.max(image.width, image.height);
  if (longest <= maxSide) return null;
  const w = Math.max(1, Math.round((image.width * maxSide) / longest));
  const h = Math.max(1, Math.round((image.height * maxSide) / longest));
  const dst = document.createElement('canvas');
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvasFor(image), 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return { proxy: { width: w, height: h, data }, scale: w / image.width };
}

export function toImageData(image: RasterImage): ImageData {
  return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}

export function encodePng(image: RasterImage): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvasFor(image).toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "cat.jpg" → "cat-bent.png" */
export function bentName(original: string, ext = 'png'): string {
  const base = original.replace(/\.[^.]+$/, '');
  return `${base}-bent.${ext}`;
}
