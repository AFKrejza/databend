import { describe, it } from 'vitest';

// Runs in Node using node-web-audio-api as the platform (see docs/testing.md).
describe('Web Audio effects', () => {
  it.todo('spike: node-web-audio-api renders Delay, Biquad, WaveShaper and Convolver offline');
  it.todo('echo: impulse + 10 px delay → spike at sample 30 with height mix');
  it.todo('filter: low-pass reduces high-frequency energy of noise');
  it.todo('every effect returns exactly n samples (n = 1, n = 10M)');
  it.todo('seeded reverb is deterministic');
});
