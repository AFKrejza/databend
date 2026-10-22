// Generates reproducible test images into public/test/ (see docs/testing.md#test-images-publictest).
import { writeImage } from '../src/cli/imageIO';
import type { RasterImage } from '../src/core/types';

function image(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set([...pixel(x, y), 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

/** gradient.png, checker.png and big.png. photo.jpg is added by hand. */
export async function makeTestImages(outDir = 'public/test'): Promise<void> {
  const gradient = image(512, 256, (x, y) => [x / 2, y, 255 - x / 2]);
  const checker = image(512, 512, (x, y) => (((x >> 3) + (y >> 3)) & 1 ? [230, 230, 230] : [30, 30, 30]));
  const big = image(4000, 3000, (x, y) => [(x * 255) / 4000, (y * 255) / 3000, ((x ^ y) >> 4) & 255]);
  await writeImage(`${outDir}/gradient.png`, gradient, false);
  await writeImage(`${outDir}/checker.png`, checker, false);
  await writeImage(`${outDir}/big.png`, big, false);
  console.log(`wrote gradient.png, checker.png, big.png to ${outDir}/`);
}

await makeTestImages();
