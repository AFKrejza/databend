// One render: stream → decode → chain → encode → insert. See docs/render-engine.md.
import type { RasterImage, Selection, Settings } from '../types';
import type { Platform } from '../platform';
import type { EffectContext, EffectInstance, JsEffect, Params, WebAudioEffect } from '../effects/types';
import { todo } from '../todo';

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

export async function render(req: RenderRequest, platform: Platform): Promise<RenderResult> {
  return todo('render');
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
  return todo('groupChain');
}

/** Render one web-audio group: AudioBuffer source → effects → destination, length fixed at n. */
export async function runWebAudioGroup(
  samples: Float32Array,
  steps: ResolvedStep<WebAudioEffect>[],
  ec: EffectContext,
  platform: Platform,
  errors: Record<string, string>,
): Promise<Float32Array> {
  return todo('runWebAudioGroup');
}

/** Truncate or zero-pad to exactly n samples. */
export function fitLength(samples: Float32Array, n: number): Float32Array {
  return todo('fitLength');
}

export function makeEffectContext(source: RasterImage, req: RenderRequest): EffectContext {
  return todo('makeEffectContext');
}
