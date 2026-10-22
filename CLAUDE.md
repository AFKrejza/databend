# CLAUDE.md

Databending app: images are edited as if their pixel bytes were audio. It has two front ends: a local web GUI (`src/web/`) and a Node CLI (`src/cli/`). Both share a platform-independent core (`src/core/`).

- The design docs live in `docs/`, starting with `docs/architecture.md`. Read the doc for the module you're touching before changing it, and update it if the design changes.
- Progress is tracked in `docs/roadmap.md`. Tick items off when they're done.
- Stack: Vite + React + TypeScript, zustand, Vitest. Effects use the Web Audio `OfflineAudioContext`, with plain-JS effects where needed. The CLI uses `node-web-audio-api` and `sharp`.
- Invariants:
  - only pixel bytes are processed, never alpha
  - output stream length equals input length
  - the base image is never mutated outside Bake
  - effect params use px/rows/Hz units, never raw sample counts
  - randomness is seeded
- `src/core/` must not touch the DOM or Node APIs:
  - images are passed as `RasterImage`
  - audio contexts come from the injected `Platform`
  - web-audio effects use only standard nodes that `node-web-audio-api` also supports (no AudioWorklet)
- A new effect or setting must work in both the GUI and the CLI (flags plus recipe).
- Commands: `npm run dev`, `npm test`, `npm run cli -- <args>`.
