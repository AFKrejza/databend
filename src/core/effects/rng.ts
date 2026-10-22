import { todo } from '../todo';

/** Seeded PRNG (mulberry32). Returns floats in [0, 1). All effect randomness goes through this. */
export function mulberry32(seed: number): () => number {
  return todo('mulberry32');
}
