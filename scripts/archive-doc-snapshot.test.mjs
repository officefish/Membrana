import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractIsoDates,
  isoStampForFilename,
  resolveDayKey,
} from './lib/archive-doc-snapshot.mjs';

test('extractIsoDates from standup and main-day-issue headers', () => {
  const standup = '# Стендап\n**2026-05-16** · текст\n<!-- Сгенерировано: 2026-05-16T05:21:27.770Z -->';
  const main = '> **Дата:** 2026-05-16 · **Роль:** Teamlead';
  assert.deepEqual(extractIsoDates(standup), ['2026-05-16']);
  assert.deepEqual(extractIsoDates(main), ['2026-05-16']);
});

test('resolveDayKey picks majority date', () => {
  const key = resolveDayKey(
    [
      { content: '**2026-05-16** ·' },
      { content: '> **Дата:** 2026-05-16' },
      { content: '<!-- Сгенерировано: 2026-05-15T12:00:00.000Z -->' },
    ],
    () => '2099-01-01',
  );
  assert.equal(key, '2026-05-16');
});

test('isoStampForFilename replaces colons', () => {
  const stamp = isoStampForFilename(new Date('2026-05-16T12:34:56.789Z'));
  assert.ok(!stamp.includes(':'));
  assert.match(stamp, /2026-05-16/);
});
