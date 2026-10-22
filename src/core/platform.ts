// Platform adapter injected into the engine. See docs/render-engine.md#platform-adapters.

export interface OfflineContextLike extends BaseAudioContext {
  startRendering(): Promise<AudioBuffer>;
}

export interface Platform {
  /** Browser: `new OfflineAudioContext(...)`. CLI: the one from node-web-audio-api. */
  createOfflineContext(channels: number, length: number, sampleRate: number): OfflineContextLike;
}
