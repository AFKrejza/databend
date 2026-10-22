// Data behind the waveform panel: the whole base stream (not just the range), before and after,
// decoded from the rendered images so it shows exactly what's in the pixels.
import type { RasterImage, Rect, Settings } from '../../core/types';
import { bytesPerSample, decode } from '../../core/codec';
import { baseRegion, buildBaseOffsets, extract, pixelToSamples, rowLength } from '../../core/stream';

export interface WaveData {
  before: Float32Array;
  after: Float32Array;
  /** Base-stream position → byte offset in the rendered image. */
  offsets: Uint32Array;
  bytesPerSample: number;
  /** Samples per scan line. */
  rowLength: number;
  /** Samples per colour plane in planar layout, else null. */
  planeLength: number | null;
  /** Rendered (possibly proxy) image size, and its scale relative to full res. */
  width: number;
  height: number;
  scale: number;
  /** Base-stream bytes at full res, for mapping ranges between proxy and full res. */
  fullLength: number;
  /**
   * The rect (in render coordinates) and settings this data was computed with. Use these, not the
   * live store values, when mapping pixels ⇄ samples: the store can change before the next render lands.
   */
  rect: Rect | null;
  settings: Settings;
}

/** Render-resolution stream positions for a full-res pixel (empty if outside the base stream). */
export function wavePositionsForPixel(wave: WaveData, x: number, y: number): number[] {
  const px = Math.floor(x * wave.scale);
  const py = Math.floor(y * wave.scale);
  return pixelToSamples(px, py, wave.width, wave.height, wave.rect, wave.settings)
    .filter((p) => p < wave.offsets.length);
}

export function computeWaveData(
  source: RasterImage, output: RasterImage, scale: number, rect: Rect | null, settings: Settings, fullLength: number,
): WaveData {
  const offsets = buildBaseOffsets(source.width, source.height, rect, settings);
  const bps = bytesPerSample(settings.encoding);
  const region = baseRegion(source.width, source.height, rect);
  return {
    before: decode(extract(source.data, offsets), settings.encoding),
    after: decode(extract(output.data, offsets), settings.encoding),
    offsets,
    bytesPerSample: bps,
    rowLength: rowLength(source.width, source.height, rect, settings) / bps,
    planeLength: settings.layout === 'planar' ? (region.w * region.h) / bps : null,
    width: source.width,
    height: source.height,
    scale,
    fullLength,
    rect,
    settings,
  };
}

/** Render-resolution stream position → full-res stream position (and back). */
export function toFullPosition(pos: number, wave: WaveData): number {
  const n = wave.offsets.length;
  return n === 0 ? 0 : Math.round((pos * wave.fullLength) / n);
}

export function toRenderPosition(pos: number, wave: WaveData): number {
  return wave.fullLength === 0 ? 0 : Math.round((pos * wave.offsets.length) / wave.fullLength);
}
