// One render: stream → decode → chain → encode → insert. See docs/render-engine.md.
import { SAMPLE_RATE, type RasterImage, type Selection, type Settings } from '../types';
import type { Platform } from '../platform';
import type { EffectContext, EffectInstance, JsEffect, Params, WebAudioEffect } from '../effects/types';
import { getEffect } from '../effects/registry';
import { bytesPerSample, decode, encode } from '../codec';
import { extract, insert } from '../stream/extract';
import { rowLength, samplesPerPixel } from '../stream/offsets';
import { OffsetCache } from './offsetCache';

export interface RenderRequest {
  /** Base image, or its proxy. */
  source: RasterImage;
  /** 1 = full res. */
  scale: number;
  settings: Settings;
  /** Already mapped to `source` coordinates (see stream/scale.ts). */
  selection: Selection;
  chain: EffectInstance[];
  seed: number;
}

export interface RenderResult {
  image: RasterImage;
  before: Float32Array;
  after: Float32Array;
  offsets: Uint32Array;
  ms: number;
  /** Effect uid → error message, for effects that failed and were skipped. */
  errors: Record<string, string>;
}

export async function render(req: RenderRequest, platform: Platform, cache?: OffsetCache): Promise<RenderResult> {
  const t0 = performance.now();
  const { source, settings } = req;
  const offsets = (cache ?? new OffsetCache()).get(source.width, source.height, req.selection, settings);

  const bytes = extract(source.data, offsets);
  const before = decode(bytes, settings.encoding);
  const errors: Record<string, string> = {};
  const ec = makeEffectContext(source, req);

  let x: Float32Array = before.slice();
  if (x.length > 0) {
    for (const group of groupChain(req.chain)) {
      if (group.kind === 'webaudio') {
        x = await runWebAudioGroup(x, group.steps, ec, platform, errors);
      } else {
        x = runJsStep(x, group.step, ec, errors);
      }
    }
  }

  const image: RasterImage = { width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) };
  insert(image.data, offsets, encode(x, settings.encoding, bytes.length));
  return { image, before, after: x, offsets, ms: performance.now() - t0, errors };
}

export interface ResolvedStep<E> {
  uid: string;
  effect: E;
  params: Params;
}

/** Consecutive web-audio effects share one OfflineAudioContext; JS effects run between them. */
export type ChainGroup =
  | { kind: 'webaudio'; steps: ResolvedStep<WebAudioEffect>[] }
  | { kind: 'js'; step: ResolvedStep<JsEffect> };

/** Drop bypassed/unknown effects and group the rest. */
export function groupChain(chain: EffectInstance[]): ChainGroup[] {
  const groups: ChainGroup[] = [];
  for (const inst of chain) {
    if (inst.bypass) continue;
    const effect = getEffect(inst.effectId);
    if (!effect) continue;
    if (effect.kind === 'js') {
      groups.push({ kind: 'js', step: { uid: inst.uid, effect, params: inst.params } });
      continue;
    }
    const last = groups[groups.length - 1];
    const step = { uid: inst.uid, effect, params: inst.params };
    if (last?.kind === 'webaudio') last.steps.push(step);
    else groups.push({ kind: 'webaudio', steps: [step] });
  }
  return groups;
}

function runJsStep(
  x: Float32Array, step: ResolvedStep<JsEffect>, ec: EffectContext, errors: Record<string, string>,
): Float32Array {
  // Work on a copy so a throwing effect can't leave half-processed samples behind.
  try {
    return fitLength(step.effect.process(x.slice(), step.params, ec), x.length);
  } catch (err) {
    errors[step.uid] = errorMessage(err);
    return x;
  }
}

/** Render one web-audio group: AudioBuffer source → effects → destination, length fixed at n. */
export async function runWebAudioGroup(
  samples: Float32Array,
  steps: ResolvedStep<WebAudioEffect>[],
  ec: EffectContext,
  platform: Platform,
  errors: Record<string, string>,
): Promise<Float32Array> {
  const n = samples.length;
  const ctx = platform.createOfflineContext(1, n, ec.sampleRate);
  const buffer = ctx.createBuffer(1, n, ec.sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  let node: AudioNode = source;
  for (const step of steps) {
    try {
      node = step.effect.build(ctx, node, step.params, ec);
    } catch (err) {
      // Nodes the failed effect already created have no path to the destination, so they're inert.
      errors[step.uid] = errorMessage(err);
    }
  }
  node.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();
  return fitLength(rendered.getChannelData(0).slice(), n);
}

/** Truncate or zero-pad to exactly n samples. */
export function fitLength(samples: Float32Array, n: number): Float32Array {
  if (samples.length === n) return samples;
  if (samples.length > n) return samples.slice(0, n);
  const out = new Float32Array(n);
  out.set(samples);
  return out;
}

export function makeEffectContext(source: RasterImage, req: RenderRequest): EffectContext {
  const bps = bytesPerSample(req.settings.encoding);
  return {
    sampleRate: SAMPLE_RATE,
    samplesPerPixel: samplesPerPixel(req.settings.layout) / bps,
    rowLength: rowLength(source.width, source.height, req.selection.rect, req.settings) / bps,
    scale: req.scale,
    seed: req.seed,
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
