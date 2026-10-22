import { describe, it } from 'vitest';

describe('stream', () => {
  it.todo('insert(extract()) is identity for every layout × scan × selection');
  it.todo('offsets are unique and never point at alpha');
  it.todo('rect offsets cover exactly the rect pixels × channels');
  it.todo('range narrows the base stream');
  it.todo('pixelToSamples inverts the offset table');
  it.todo('pixelSpanToRange covers first sample of A to last sample of B');
});
