// Range selection → rectangles to highlight on the image (the wrapped "Audacity" band).
import type { Rect, SampleRange, Settings } from '../types';
import { samplesPerPixel } from './offsets';

/**
 * Pixels covered by `range` (base-stream positions) inside `region`, as up to three rects:
 * the partial first scan line, the full lines in between, and the partial last line.
 * A planar range that crosses a plane boundary highlights the whole region.
 */
export function rangeToBands(range: SampleRange, region: Rect, settings: Settings): Rect[] {
  const nPix = region.w * region.h;
  if (range.end <= range.start || nPix === 0) return [];
  const lineLen = settings.scan === 'rows' ? region.w : region.h;

  let k0: number;
  let k1: number;
  if (settings.layout === 'planar') {
    if (Math.floor(range.start / nPix) !== Math.floor((range.end - 1) / nPix)) return [region];
    k0 = range.start % nPix;
    k1 = (range.end - 1) % nPix;
  } else {
    const spp = samplesPerPixel(settings.layout);
    k0 = Math.floor(range.start / spp);
    k1 = Math.min(nPix - 1, Math.floor((range.end - 1) / spp));
  }

  const l0 = Math.floor(k0 / lineLen);
  const l1 = Math.floor(k1 / lineLen);
  const c0 = k0 % lineLen;
  const c1 = k1 % lineLen;
  // Bands as [line, firstCol, lineCount, colCount] in scan space.
  const spans: [number, number, number, number][] = l0 === l1
    ? [[l0, c0, 1, c1 - c0 + 1]]
    : [[l0, c0, 1, lineLen - c0], [l0 + 1, 0, l1 - l0 - 1, lineLen], [l1, 0, 1, c1 + 1]];

  return spans
    .filter(([, , lines, cols]) => lines > 0 && cols > 0)
    .map(([line, col, lines, cols]) => settings.scan === 'rows'
      ? { x: region.x + col, y: region.y + line, w: cols, h: lines }
      : { x: region.x + line, y: region.y + col, w: lines, h: cols });
}
