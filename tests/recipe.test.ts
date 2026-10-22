import { describe, it } from 'vitest';

describe('recipe', () => {
  it.todo('parse/serialize round-trip');
  it.todo('unknown effect or param throws');
  it.todo('out-of-range values clamp with a warning; missing params get defaults');
  it.todo('fractional range resolves to samples for any image size');
  it.todo('flags override recipe values (mergeRecipe)');
  it.todo('recipeToCliCommand produces args parseCliArgs accepts');
});
