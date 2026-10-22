// Effect interface. See docs/effects.md#interface-typests.

export type Unit = 'px' | 'rows' | 'hz' | 'db' | '%' | 'x';

export type ParamSpec =
  | {
      key: string; label: string; type: 'number'; min: number; max: number; step?: number;
      default: number; unit?: Unit; curve?: 'linear' | 'log';
    }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: 'bool'; default: boolean };

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export interface EffectContext {
  sampleRate: number;
  /** Stream samples per image pixel (3, 1, or 1.5 for 16-bit interleaved). */
  samplesPerPixel: number;
  /** Samples per scan line of the base stream, at the current scale. */
  rowLength: number;
  /** Proxy scale, 1 at full resolution. */
  scale: number;
  seed: number;
}

export interface WebAudioEffect {
  kind: 'webaudio';
  id: string;
  name: string;
  params: ParamSpec[];
  /** Wire nodes from `input`; return the output node. Only standard nodes (see docs/effects.md). */
  build(ctx: BaseAudioContext, input: AudioNode, p: Params, ec: EffectContext): AudioNode;
}

export interface JsEffect {
  kind: 'js';
  id: string;
  name: string;
  params: ParamSpec[];
  /** May modify `x` in place. Must return the same length. */
  process(x: Float32Array, p: Params, ec: EffectContext): Float32Array;
}

export type Effect = WebAudioEffect | JsEffect;

/** One entry in the user's chain. */
export interface EffectInstance {
  uid: string;
  effectId: string;
  params: Params;
  bypass: boolean;
}
