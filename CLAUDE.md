# CLAUDE.md

Databending web app: images are edited as if their pixel bytes were audio. It runs locally, in the browser only.

- The design docs live in `docs/`, starting with `docs/architecture.md`. Read the doc for the module you're touching before changing it, and update it if the design changes.
- Progress is tracked in `docs/roadmap.md`. Tick items off when they're done.
- Stack: Vite + React + TypeScript, zustand, Vitest. Effects use the Web Audio `OfflineAudioContext`, with plain-JS effects where needed.
- Invariants:
  - only pixel bytes are processed, never alpha
  - output stream length equals input length
  - the base image is never mutated outside Bake
  - effect params use px/rows/Hz units, never raw sample counts
  - randomness is seeded
- `codec/`, `stream/`, `waveform/` and the JS effects must stay DOM-free so they can be tested in Node.
- Commands: `npm run dev`, `npm test`.
