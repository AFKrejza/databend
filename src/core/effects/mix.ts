/**
 * Sum `input` (dry, gain 1 - mix) and `wet` (gain mix) into one output node.
 * Shared by distortion, wah and reverb.
 */
export function dryWet(ctx: BaseAudioContext, input: AudioNode, wet: AudioNode, mix: number): AudioNode {
  const out = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 1 - mix;
  input.connect(dry).connect(out);
  const wetGain = ctx.createGain();
  wetGain.gain.value = mix;
  wet.connect(wetGain).connect(out);
  return out;
}

/** Same as dryWet for plain arrays: x = (1 - mix)·dry + mix·wet, written into `wet`. */
export function mixArrays(dry: Float32Array, wet: Float32Array, mix: number): Float32Array {
  for (let i = 0; i < wet.length; i++) wet[i] = (1 - mix) * dry[i] + mix * wet[i];
  return wet;
}
