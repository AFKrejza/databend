import { OfflineAudioContext } from 'node-web-audio-api';
import type { OfflineContextLike, Platform } from '../core/platform';

// node-web-audio-api ships its own typings, so they don't line up exactly with the DOM ones.
export const nodePlatform: Platform = {
  createOfflineContext: (channels, length, sampleRate) =>
    new OfflineAudioContext(channels, length, sampleRate) as unknown as OfflineContextLike,
};
