# CLI

The CLI runs the same core as the web app (codec → stream → effects → engine) on image files, with no browser. It is useful for batch-processing folders and scripting, and for re-applying a look you designed in the GUI.

## How it runs without a browser
| Need | In the browser | In the CLI (Node) |
|---|---|---|
| Decode/encode image files | `createImageBitmap` + canvas | [`sharp`](https://sharp.pixelplumbing.com/) → raw RGBA buffer. It also reads **TIFF**, unlike browsers. |
| Web Audio effects | `window.OfflineAudioContext` | [`node-web-audio-api`](https://www.npmjs.com/package/node-web-audio-api), a Rust implementation of the same API |
| JS effects, codec, stream | same code | same code |

The engine never creates audio contexts or touches `ImageData` itself. It receives a `RasterImage` (`{ width, height, data: Uint8ClampedArray }`) and a `createOfflineContext` function. The web app passes the browser's, and the CLI passes `node-web-audio-api`'s. See [render-engine.md](render-engine.md#platform-adapters).

**Caveat:** the two Web Audio implementations follow the same spec but aren't bit-identical. Filters and waveshaping can differ by tiny amounts, so a CLI render may differ from the GUI by a few byte values in places. JS-only chains are identical.

## Usage
```
databend <input...> [options]
databend effects                 # list effects
databend effects <id>            # show one effect's params, ranges, defaults
```

| Option | Meaning | Default |
|---|---|---|
| `-o, --out <path>` | Output file, or a folder when there are several inputs | `<name>-bent.png` next to the input |
| `-e, --encoding <enc>` | `mulaw`, `alaw`, `u8`, `s8`, `s16be`, `s16le` | `mulaw` |
| `-l, --layout <layout>` | `interleaved`, `planar`, `r`, `g`, `b` | `interleaved` |
| `-s, --scan <scan>` | `rows`, `columns` | `rows` |
| `--rect <x,y,w,h>` | Rect selection in pixels | whole image |
| `--range <start:end>` | Range within the base stream: sample indices, or fractions like `0.25:0.5` | all |
| `-f, --fx "<id> k=v ..."` | Add an effect. Repeatable, runs in order. Unspecified params use defaults. | — |
| `-r, --recipe <file.json>` | Load settings, selection and chain from a recipe. Flags given on the command line override it. | — |
| `--seed <n>` | Seed for random effects | 1 |
| `--waveform <file.png>` | Also save a before/after waveform image of the stream | — |
| `--dry-run` | Print the resolved recipe and sample count, but don't render | — |
| `-q, --quiet` | Print nothing except errors | — |

Examples:
```
databend cat.jpg -f "echo time=30 feedback=0.5"
databend cat.jpg -s columns -f "echo time=20 unit=rows" -f "distortion drive=20 curve=foldback"
databend scan.tif --rect 0,200,1920,300 -f "wah period=10 q=8" -o out/
databend photos/*.png -r looks/vhs.json -o bent/
```
On Windows, PowerShell doesn't expand `*.png`, so the CLI expands globs itself with `fast-glob`.

**Output:** PNG by default, or chosen from the `-o` extension (`.png`, `.webp` lossless, `.tif`). JPEG is refused, because lossy compression would smear the bent bytes. Use `--allow-lossy` to force it.

## Recipes (shared with the GUI)
A recipe is a JSON file describing everything except the image itself. The GUI has **Save recipe / Load recipe** buttons, so you can design a look interactively and then batch it in the CLI.
```json
{
  "version": 1,
  "settings": { "encoding": "mulaw", "layout": "interleaved", "scan": "rows" },
  "selection": { "rect": null, "range": { "start": 0.25, "end": 0.5, "unit": "fraction" } },
  "chain": [
    { "effect": "echo", "params": { "time": 30, "unit": "px", "feedback": 0.5, "mix": 0.5 } },
    { "effect": "wah", "params": { "period": 20, "q": 5 }, "bypass": false }
  ],
  "seed": 1
}
```
Rules:
- Params are validated against each effect's `ParamSpec`. Unknown effects or params are errors, values out of range are clamped with a warning, and missing params use defaults.
- Selections in a recipe are applied as-is. A `rect` outside the image is clipped. A `range` has `"unit": "fraction"` (0–1 of the base stream, which scales to any image size and suits batch use) or `"unit": "samples"`. The GUI saves fractions.
- `version` lets the format change later without breaking old files.

## Implementation (`src/cli/`)
| File | Job |
|---|---|
| `main.ts` | Parses arguments with `node:util` `parseArgs` and dispatches the subcommands |
| `fxParse.ts` | Turns `"echo time=30 unit=rows"` into `{ effect, params }`, with number/bool/select coercion from `ParamSpec` |
| `recipe.ts` | Loads, validates and merges recipes. Shared with the GUI, so it lives in `core/`. |
| `imageIO.ts` | `sharp` → `RasterImage` and back |
| `waveformPng.ts` | Draws peaks with `computePeaks` onto a raw RGBA buffer and saves it with `sharp` |

- Run in development with `npm run cli -- cat.jpg -f "echo time=30"` (uses `tsx`).
- `npm run build:cli` bundles to `dist-cli/cli.js`, kept separate from Vite's `dist/`. `package.json` has `"bin": { "databend": "dist-cli/cli.js" }`, so after `npm link` the `databend` command works anywhere.
- Exit codes: 0 means OK, 1 means bad arguments or recipe, 2 means an input couldn't be read or processed. Batch mode keeps going after a failed file and exits 2 at the end.
- Progress for batches is one line per file, e.g. `cat.jpg → bent/cat-bent.png (1.2 MP, 184 ms)`.
