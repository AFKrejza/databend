import type { JsEffect } from './types';

export const reverse: JsEffect = {
  kind: 'js',
  id: 'reverse',
  name: 'Reverse',
  params: [],
  process(x) {
    return x.reverse();
  },
};
