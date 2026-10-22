# Waveform panel

A strip at the bottom of the screen shows the image's pixel stream as a waveform, like an Audacity track. The point is to make it visible what the effects are doing to the "audio". There is no playback; it would just be noise.

## What it shows
- **The base stream:** the whole image, or the rect selection if there is one. It uses the current encoding, layout and scan, so it is exactly what the effects receive.
- **Before** is drawn in grey and **after** in the accent colour on top, with partial transparency. A toggle switches to **stacked** mode (before lane above, after lane below) for when overlay gets cluttered.
- The data is `render.before` and `render.after` from the store. When the preview uses the proxy, so does the waveform. The status bar says so.
- The Y axis runs from −1 to 1, with a centre line and faint lines at ±0.5.

## Drawing it fast (`src/core/waveform/peaks.ts`)
`peaks.ts` is in `core/`, so the CLI's `--waveform out.png` uses it too and draws the same picture to a file.
A stream can hold millions of samples but the panel is about 1500 px wide, so we draw **min/max peaks per screen column**, as Audacity does:
```ts
computePeaks(samples: Float32Array, from: number, to: number, columns: number): { min: Float32Array; max: Float32Array }
```
- **Peak cache:** after each render, precompute min/max for blocks of 256 samples, which is one linear pass. If a view has ≥ 256 samples per column, read from the cache. Otherwise read the raw samples. Zoom and scroll then never touch the full array.
- **Drawing:** a 2D canvas scaled by `devicePixelRatio`. Each column is one vertical line from min to max.
- **Zoomed in:** at fewer than about 2 samples per pixel, draw a polyline through the samples instead. Past about 8 px per sample, also draw a dot per sample.
- **Redraws** happen only when the data, view, size or selection changes, batched with `requestAnimationFrame`.

## View and navigation
```ts
interface WaveView { start: number; samplesPerPx: number }   // left-edge sample + zoom
```
| Input | Action |
|---|---|
| Wheel / Shift+wheel | Scroll |
| Ctrl+wheel | Zoom around the cursor |
| `+` / `−` buttons | Zoom |
| "Fit" button | Show the whole stream |
| "Zoom to selection" button | Fit the selected range |
| Minimap strip (thin, above the waveform) | Shows the visible window over the whole stream; drag it to jump |

Zoom is clamped between "whole stream fits" and 32 px per sample.

## Row ticks
Draw faint vertical lines every `rowLength` samples to mark scan lines. If they would be closer than 6 px apart, draw every Nth (N = 2, 5, 10, 50…) and label them "row 120" and so on. Planar layout also gets stronger lines at plane boundaries, labelled "R | G | B".

## Linked selection
- **Dragging** on the waveform sets `selection.range = { start, end }` within the base stream. The image overlay highlights those pixels. In interleaved mode a pixel is highlighted if any of its channels is selected.
- A range made on the image with the range tool shows as a highlighted region on the waveform, auto-scrolled into view.
- **Shift+drag** extends the selection, **double-click** selects all, and **Esc** clears it.
- Edges snap to whole pixels (multiples of `samplesPerPixel`), with Alt to disable snapping.

## Linked cursor
- **Hovering the waveform** at sample `i`: `offsets[i]` → pixel (x, y) and channel, and a crosshair is drawn on the image overlay.
- **Hovering the image** at pixel (x, y): `pixelToSamples(x, y)` → sample indices. A playhead line is drawn on the waveform at each one, which means three lines in planar mode, one per plane. If the playhead is off screen, an edge arrow shows its direction.
- The **readout** in the status bar shows: `sample 482,113 · px (412, 87) · G · byte 0x3A→0xC1 · −0.42→+0.07`.

## Tests
- `computePeaks` matches a brute-force min/max for random arrays, for both cached and raw paths, and for edge cases (`from == to`, fewer samples than columns).
- View maths: sample ⇄ x conversions round-trip, and zoom around the cursor keeps the sample under the cursor fixed.
