import { todo } from '../todo';

/**
 * Sum `input` (dry, gain 1 - mix) and `wet` (gain mix) into one output node.
 * Shared by echo, distortion, wah and reverb.
 */
export function dryWet(ctx: BaseAudioContext, input: AudioNode, wet: AudioNode, mix: number): AudioNode {
  return todo('dryWet');
}
