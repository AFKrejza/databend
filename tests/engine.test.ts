import { describe, expect, it } from 'vitest';
import { nodePlatform } from '../src/cli/nodePlatform';
import { groupChain, render, type RenderRequest } from '../src/core/engine/render';
import { createInstance } from '../src/core/effects/registry';
import { offsetToPixel } from '../src/core/stream/offsets';
import { DEFAULT_SETTINGS, EMPTY_SELECTION, ENCODINGS } from '../src/core/types';
import { makeImage } from './helpers';

function request(overrides: Partial<RenderRequest> = {}): RenderRequest {
  return {
    source: makeImage(40, 30), scale: 1, settings: DEFAULT_SETTINGS,
    selection: EMPTY_SELECTION, chain: [], seed: 1, ...overrides,
  };
}

describe('engine', () => {
  it.each(ENCODINGS)('empty chain is lossless (%s)', async (encoding) => {
    const req = request({ settings: { ...DEFAULT_SETTINGS, encoding } });
    const { image } = await render(req, nodePlatform);
    expect(image.data).toEqual(req.source.data);
  });

  it('does not mutate the source', async () => {
    const req = request({ chain: [createInstance('gain', { invert: true })] });
    const copy = req.source.data.slice();
    await render(req, nodePlatform);
    expect(req.source.data).toEqual(copy);
  });

  it('selection leaves outside pixels and alpha untouched', async () => {
    const rect = { x: 5, y: 5, w: 10, h: 8 };
    const req = request({
      selection: { rect, range: null },
      chain: [createInstance('gain', { invert: true }), createInstance('distortion', { drive: 50 })],
    });
    const { image } = await render(req, nodePlatform);
    let changedInside = 0;
    for (let o = 0; o < image.data.length; o++) {
      const { x, y, channel } = offsetToPixel(o, image.width);
      const inside = x >= 5 && x < 15 && y >= 5 && y < 13 && channel !== 3;
      if (!inside) expect(image.data[o]).toBe(req.source.data[o]);
      else if (image.data[o] !== req.source.data[o]) changedInside++;
    }
    expect(changedInside).toBeGreaterThan(0);
  });

  it('groups consecutive web-audio effects, runs JS effects between', () => {
    const chain = [
      createInstance('distortion'), createInstance('filter'), createInstance('echo'),
      createInstance('wah'), { ...createInstance('reverb'), bypass: true },
    ];
    expect(groupChain(chain).map((g) => (g.kind === 'webaudio' ? g.steps.length : 'js'))).toEqual([2, 'js', 1]);
  });

  it('output length always equals input length, and before/after line up', async () => {
    const req = request({ chain: [createInstance('reverb', { length: 5000 }), createInstance('echo', { time: 2000 })] });
    const r = await render(req, nodePlatform);
    expect(r.before.length).toBe(40 * 30 * 3);
    expect(r.after.length).toBe(r.before.length);
    expect(r.offsets.length).toBe(r.before.length);
    expect(r.errors).toEqual({});
  });

  it('16-bit encodings work on an odd-length stream', async () => {
    const req = request({
      source: makeImage(3, 3), settings: { ...DEFAULT_SETTINGS, encoding: 's16be', layout: 'r' },
      chain: [createInstance('filter')],
    });
    const r = await render(req, nodePlatform);
    expect(r.before.length).toBe(5);
    expect(r.image.data.length).toBe(36);
  });
});
