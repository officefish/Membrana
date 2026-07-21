import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatDreamDigestMd } from './lib/dreams-format.mjs';

test('formatDreamDigestMd: empty-state и <6 честно', () => {
  const empty = formatDreamDigestMd({
    day: '2026-07-20',
    winners: [],
    heats: [],
    noWinnerHeats: [0, 1, 2, 3, 4, 5],
  });
  assert.match(empty, /не сформированы/u);
  assert.match(empty, /winners: 0/u);

  const md = formatDreamDigestMd({
    day: '2026-07-20',
    winners: [
      {
        hour: 2,
        text: 'Сон один',
        author: 'Мастер снов',
        version: '1.0.0',
        pair: ['a', 'b'],
        provider: 'grok',
        attempts: [{}, {}],
        seed: 's',
      },
    ],
    heats: [],
    noWinnerHeats: [1, 2, 3, 4, 5],
  });
  assert.match(md, /Победителей: \*\*1\*\*\/6/u);
  assert.match(md, /Сон один/u);
  assert.match(md, /Мастер снов/u);
});
