2026-10-19

# Databend

Databending app for editing images as though they are audio.

You import an image. The app turns its pixel bytes into audio samples (μ-law by default, like the old Audacity "Import Raw" trick) and runs audio effects on them, such as echo, wah, distortion and reverb. It writes the result straight back into the image, so you see changes live. A waveform panel at the bottom shows the "audio" you are bending.

The `example` folder contains a worked example and some notes on getting a good result.

The original workflow was GIMP → `.tif` → Audacity (raw, μ-law) → effects → raw export. It often produced files that wouldn't open, because the effects also hit the file header. This app only feeds pixel bytes through the effects and always writes a fresh PNG, so the output can't be corrupted.

It works two ways, both running the same core code:
- **Web GUI** with live preview, selections and the waveform view
- **CLI** for batch processing and scripting. It also reads TIFF.

## Stack
- TypeScript throughout
- GUI: Vite + React + zustand, runs locally in the browser (no server)
- CLI: Node, with `sharp` for image files and `node-web-audio-api` for the audio effects
- Web Audio API (`OfflineAudioContext`) for the DSP effects, plus small hand-written JS effects
- Vitest for tests

## Running
```
npm install
npm run dev                                   # GUI: open the printed localhost URL
npm run cli -- cat.jpg -f "echo time=30"      # CLI during development
```

### Extras
```
npm run build:cli; npm link                   # then just: databend cat.jpg -f "echo time=30"
npm test                                      # unit + CLI tests (Node)
npm run make-test-images                      # test images in public/test/
npm run smoke -- http://localhost:5173        # browser smoke test against a running dev server
```
A look designed in the GUI can be saved as a recipe and reused: `databend photos/*.png -r look.json -o bent/`.

## Environment Variables
No environment variables need to be set.

## Example Invocation:
`npm run cli -- <path>\databend\example\bird.png -f "echo time=30"`

Output will be in `example/bird-bent.png`, processed one is `example/bird-bent-ex.png`.

To use the GUI you can run `npm run dev` and open it in a web browser.

## Docs
| File | What it covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Big picture: data flow, modules, state |
| [docs/codec.md](docs/codec.md) | Bytes ⇄ samples (μ-law, A-law, 8/16-bit PCM) |
| [docs/stream-and-selection.md](docs/stream-and-selection.md) | How pixels become a sample stream; channel layout, scan order, selections |
| [docs/effects.md](docs/effects.md) | Effect interface, registry, and every v1 effect |
| [docs/render-engine.md](docs/render-engine.md) | Render pipeline, live preview, proxy, bake, undo |
| [docs/ui.md](docs/ui.md) | Screen layout, components, controls, shortcuts |
| [docs/waveform.md](docs/waveform.md) | The bottom waveform panel |
| [docs/cli.md](docs/cli.md) | CLI usage, flags, recipe format, Node adapters |
| [docs/testing.md](docs/testing.md) | Unit tests, browser tests, manual checklist |
| [docs/roadmap.md](docs/roadmap.md) | Milestones and progress checklist |
