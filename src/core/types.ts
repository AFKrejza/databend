// Shared types for the platform-independent core. See docs/architecture.md.

/** Plain RGBA image. A browser `ImageData` satisfies this shape. */
export interface RasterImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export type Encoding = 'mulaw' | 'alaw' | 'u8' | 's8' | 's16be' | 's16le';
export const ENCODINGS: readonly Encoding[] = ['mulaw', 'alaw', 'u8', 's8', 's16be', 's16le'];

/** Which channel bytes go into the stream, and in what order. See docs/stream-and-selection.md. */
export type Layout = 'interleaved' | 'planar' | 'r' | 'g' | 'b';
export const LAYOUTS: readonly Layout[] = ['interleaved', 'planar', 'r', 'g', 'b'];

export type Scan = 'rows' | 'columns';
export const SCANS: readonly Scan[] = ['rows', 'columns'];

export interface Settings {
  encoding: Encoding;
  layout: Layout;
  scan: Scan;
}

export const DEFAULT_SETTINGS: Settings = { encoding: 'mulaw', layout: 'interleaved', scan: 'rows' };

/** Rectangle in full-resolution pixel coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Byte positions in the base stream, `end` exclusive. Bytes rather than samples so that
 * switching between 8- and 16-bit encodings doesn't move the selection.
 */
export interface SampleRange {
  start: number;
  end: number;
}

export interface Selection {
  rect: Rect | null;
  range: SampleRange | null;
}

export const EMPTY_SELECTION: Selection = { rect: null, range: null };

/** Made-up sample rate. It only gives Hz parameters a meaning. */
export const SAMPLE_RATE = 44100;
