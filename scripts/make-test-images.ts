// Generates reproducible test images into public/test/ (see docs/testing.md#test-images-publictest).
import { todo } from '../src/core/todo';

/** gradient.png, checker.png and big.png. photo.jpg is added by hand. */
export async function makeTestImages(outDir = 'public/test'): Promise<void> {
  todo(`makeTestImages(${outDir})`);
}

await makeTestImages();
