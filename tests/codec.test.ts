import { describe, expect, it } from 'vitest';
import { decode, encode } from '../src/core/codec';
import { mulawDecodeByte, mulawEncodeSample } from '../src/core/codec/mulaw';
import { alawDecodeByte } from '../src/core/codec/alaw';
import { ENCODINGS } from '../src/core/types';

const ALL_BYTES = Uint8Array.from({ length: 256 }, (_, i) => i);

describe('codec', () => {
  it.each(ENCODINGS)('round-trips all 256 bytes for %s', (enc) => {
    expect(encode(decode(ALL_BYTES, enc), enc, 256)).toEqual(ALL_BYTES);
  });

  it.each(['s16be', 's16le'] as const)('%s: odd stream is padded and comes back at its original length', (enc) => {
    const bytes = Uint8Array.from([1, 2, 3, 250, 251]);
    const samples = decode(bytes, enc);
    expect(samples.length).toBe(3);
    expect(encode(samples, enc, 5)).toEqual(bytes);
  });

  it('μ-law: 0x7F decodes to -0 and re-encodes to 0x7F', () => {
    expect(Object.is(mulawDecodeByte(0x7f), -0)).toBe(true);
    expect(Object.is(mulawDecodeByte(0xff), 0)).toBe(true);
    expect(mulawEncodeSample(-0)).toBe(0x7f);
    expect(mulawEncodeSample(0)).toBe(0xff);
  });

  it('μ-law decode matches G.711 reference values', () => {
    // Values in 16-bit units from the standard decode table.
    expect(mulawDecodeByte(0x00) * 32768).toBe(-32124);
    expect(mulawDecodeByte(0x80) * 32768).toBe(32124);
    expect(mulawDecodeByte(0x0f) * 32768).toBe(-16764);
    expect(mulawDecodeByte(0x7e) * 32768).toBe(-8);
    expect(mulawDecodeByte(0xfe) * 32768).toBe(8);
  });

  it('A-law decode matches G.711 reference values', () => {
    expect(alawDecodeByte(0xd5) * 32768).toBe(8);
    expect(alawDecodeByte(0x55) * 32768).toBe(-8);
    expect(alawDecodeByte(0xaa) * 32768).toBe(32256);
    expect(alawDecodeByte(0x2a) * 32768).toBe(-32256);
  });

  it.each(ENCODINGS)('%s encoder clamps ±2, NaN and ±Infinity', (enc) => {
    const wild = Float32Array.from([2, -2, NaN, Infinity, -Infinity]);
    const n = enc.startsWith('s16') ? 10 : 5;
    const bytes = encode(wild, enc, n);
    expect(bytes.length).toBe(n);
    const back = decode(bytes, enc);
    expect(back[0]).toBeGreaterThan(0.9);
    expect(back[1]).toBeLessThan(-0.9);
    expect(Math.abs(back[2])).toBeLessThan(0.01);
  });

  it('pads missing samples with silence', () => {
    const bytes = encode(new Float32Array(0), 'u8', 3);
    expect(Array.from(bytes)).toEqual([128, 128, 128]);
  });
});
