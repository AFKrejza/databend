# Testing

## Unit tests (Vitest, Node), `npm test`
These cover the pure modules, which don't need a browser:

| File | Checks |
|---|---|
| `tests/codec.test.ts` | Every encoding round-trips all 256 byte values. Includes the μ-law −0 case, the G.711 reference values, and clamping of out-of-range values, NaN and Infinity. |
| `tests/stream.test.ts` | `insert(extract())` is an identity for every layout × scan × selection. Offsets are unique and never point at alpha bytes. The range subarray is correct and `pixelToSamples` inverts `offsets`. |
| `tests/jsEffects.test.ts` | Bitcrush, reverse, gain and normalize on small known arrays. Each keeps the length and is deterministic. |
| `tests/units.test.ts` | px/rows/hz → samples at scale 1 and on the proxy |
| `tests/peaks.test.ts` | Peak cache matches a brute-force calculation, and the view-maths round trips work |

Tests use plain `{ width, height, data: Uint8ClampedArray }` objects, not `ImageData`, so no DOM is needed.

## Browser tests (later), `npm run test:browser`
The Web Audio effects only run in a real browser. Use Vitest browser mode (or Playwright) with Chromium:
- **Echo:** an impulse at sample 0 with time = 10 px (interleaved) gives a spike at sample 30 with height `mix`.
- **Filter:** a low-pass on white noise reduces the high-frequency energy.
- **Length:** each web-audio effect returns exactly `n` samples, including n = 1 and n = 10M.
- **Determinism:** the same request twice gives byte-identical output (seeded reverb).
- **Smoke:** load a test image, add an echo, export, and check that the exported PNG decodes with the same dimensions.

## Test images (`public/test/`)
Generate these with a small script so they are reproducible:
- `gradient.png`: horizontal RGB gradient, which makes the codec mapping and echoes easy to read
- `checker.png`: 8 px checkerboard, which shows delays and smearing direction
- `photo.jpg`: any real photo, for checking the look
- `big.png`: 4000×3000 image, for proxy and performance checks

## Manual checklist
1. Import `gradient.png` with an empty chain and μ-law encoding. The output is identical to the input (the toggle shows no difference).
2. Echo with 30 px gives a ghost 30 px to the right. Echo with 20 rows gives a ghost 20 rows down.
3. Columns scan makes the echo vertical.
4. A rect selection changes only the inside of the rectangle. A range selection changes a wrapped band with ragged ends.
5. Dragging on the waveform highlights the matching band on the image. Hovering a pixel moves the waveform playhead to the matching sample.
6. The echo is visible in the waveform as a repeated, fainter copy.
7. Extreme settings (distortion drive 100, 5000 px reverb, wah Q 20) still export a valid PNG that opens in an image viewer.
8. With `big.png`, moving a slider updates the preview in under about 200 ms. Export produces the full 4000×3000 image.
9. Bake, then undo, restores the previous image and chain.
