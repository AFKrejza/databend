import type { Platform } from '../core/platform';

export const webPlatform: Platform = {
  createOfflineContext: (channels, length, sampleRate) => new OfflineAudioContext(channels, length, sampleRate),
};
