import { describe, it } from 'vitest';

describe('codec', () => {
  it.todo('round-trips all 256 bytes for every encoding');
  it.todo('μ-law: 0x7F decodes to -0 and re-encodes to 0x7F');
  it.todo('μ-law decode matches G.711 reference values');
  it.todo('encoder clamps ±2, NaN and ±Infinity');
  it.todo('16-bit encodings pad an odd stream and return the original length');
});
