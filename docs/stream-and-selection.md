# Stream, layout and selection

`src/core/stream/` decides **which bytes of the image, in which order** become the "audio". An echo looks very different depending on whether the next sample is the next channel, the next pixel to the right, or the pixel below.

## Core idea: the offset table
For given settings and a selection, we build one `Uint32Array offsets`, where `offsets[i]` is the byte index in `ImageData.data` of stream sample `i`. Everything else is trivial:
```ts
extract: stream[i] = data[offsets[i]]
insert:  data[offsets[i]] = stream[i]
```
The same table gives the waveform ⇄ image mapping for free: sample `i` → byte `o` → pixel `p = o >> 2`, `x = p % W`, `y = p / W | 0`, channel `o & 3`.

Memory is 4 bytes per sample. A 2000×2000 image is about 48 MB, which is fine. The table is rebuilt only when the selection, layout, scan or image size changes, and it is cached by the engine.

```ts
interface StreamSettings { layout: Layout; scan: Scan }
buildOffsets(width: number, height: number, sel: Selection, s: StreamSettings): Uint32Array
pixelToSamples(x: number, y: number, ...): number[]   // inverse, for image-hover → waveform playhead
```
Both functions take plain `{ width, height }` numbers, not `ImageData`, so they test in Node.

## Channel layout
| Layout | Stream order | Effect on the image |
|---|---|---|
| `interleaved` (default) | R G B R G B … | Matches an uncompressed TIFF, as in Audacity. Short delays shift colours between channels. |
| `planar` | all R, then all G, then all B | Each colour plane is its own "track". Long effects bleed from one plane into the next. |
| `r` / `g` / `b` | only that channel | The other channels are untouched, giving single-colour glitches. |

Alpha is never in the stream. Images with transparency keep their alpha as is.

`samplesPerPixel` is 3 for `interleaved` and 1 otherwise. Effects use it to convert "pixels" to "samples".

## Scan order
| Scan | Pixel order | Result |
|---|---|---|
| `rows` (default) | left→right, then top→bottom | Echoes and smears go horizontal. A delay of exactly one row looks vertical. |
| `columns` | top→bottom, then left→right | Everything turns 90°, so smears go vertical. |

`rowLength` is the number of samples in one scan line: `width × samplesPerPixel` for rows, `height × samplesPerPixel` for columns. Inside a rectangle selection, the rectangle's width or height is used instead. Effects use it for "rows" units, and the waveform uses it for row tick marks.

## Selection
```ts
interface Selection {
  rect: { x: number; y: number; w: number; h: number } | null;  // full-res pixel coords
  range: { start: number; end: number } | null;                  // sample indices into the base stream, end exclusive
}
```
Two steps:
1. **Base stream:** the whole image if `rect` is null, otherwise just the rectangle. The rectangle is scanned in the current scan order, with each scan line's slice joined end to end.
2. **Range:** if set, only samples `[start, end)` of the base stream are processed. This is the "Audacity mode" selection: a contiguous run of bytes that wraps across rows, so the processed area has ragged ends.

How the tools set it:
- **Rect tool (image):** drag to set `rect`. This clears `range`, and the waveform then shows just the rectangle's stream.
- **Range tool (image):** drag from pixel A to pixel B. This clears `rect` and sets `range` to the first sample of A through the last sample of B. In `planar` layout, the range covers the R plane (documented behaviour).
- **Waveform drag:** sets `range` within the current base stream. It works together with `rect`.
- **Esc** clears both, and the whole image is selected again.

Implementation: build the base-stream offsets, then `offsets.subarray(start, end)` for the range. A subarray costs nothing to create.

## Proxy coordinates
The selection is stored in **full-resolution** coordinates. For a preview proxy at scale `k`, `rect` is scaled by `k` and rounded. `range` is mapped proportionally: `start × nProxy / nFull`. The preview is therefore approximate and the export is exact. See [render-engine.md](render-engine.md#preview-proxy).

## Tests
- `insert(extract(img))` is an identity for every layout × scan × selection combination.
- Every offset is unique and none points at an alpha byte.
- Inside the selection, `offsets` is a permutation of the pixel bytes (count = pixels × channels).
- `pixelToSamples` inverts `offsets`.
