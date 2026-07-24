import { test } from 'node:test';
import assert from 'node:assert/strict';

import { attachDigestSource, formatDreamDigestMd } from './lib/dreams-format.mjs';

test('formatDreamDigestMd: never-ran ≠ ran-empty (tri-state)', () => {
  const never = formatDreamDigestMd(
    attachDigestSource(
      {
        day: '2026-07-20',
        winners: [],
        heats: [],
        noWinnerHeats: [0, 1, 2, 3, 4, 5],
        eventCount: 0,
        status: 'never-ran',
        reason: 'day-log-missing',
      },
      { kind: 'local-volume', root: '/tmp/dreams-volume', producerAlive: null },
    ),
  );
  assert.match(never, /status: never-ran/u);
  assert.match(never, /Не запускалось/u);
  assert.match(never, /не запускалась/u);
  assert.match(never, /локальный том/u);
  assert.doesNotMatch(never, /Отработало пусто/u);
  assert.doesNotMatch(never, /не сформированы/u);

  const empty = formatDreamDigestMd(
    attachDigestSource(
      {
        day: '2026-07-20',
        winners: [],
        heats: [],
        noWinnerHeats: [0, 1, 2, 3, 4, 5],
        eventCount: 6,
        status: 'ran-empty',
        reason: 'no-winner-selected',
      },
      { kind: 'office', root: '/var/lib/membrana-dreams', producerAlive: true },
    ),
  );
  assert.match(empty, /status: ran-empty/u);
  assert.match(empty, /Отработало пусто/u);
  assert.match(empty, /сервер \(office\)/u);
  assert.match(empty, /жива/u);
  assert.doesNotMatch(empty, /Не запускалось/u);
});

test('formatDreamDigestMd: has-winners и <6 честно', () => {
  const md = formatDreamDigestMd(
    attachDigestSource(
      {
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
        eventCount: 8,
        status: 'has-winners',
        reason: null,
      },
      { kind: 'office', root: '/var/lib/membrana-dreams', producerAlive: true },
    ),
  );
  assert.match(md, /status: has-winners/u);
  assert.match(md, /Победителей: \*\*1\*\*\/6/u);
  assert.match(md, /Сон один/u);
  assert.match(md, /Мастер снов/u);
});
