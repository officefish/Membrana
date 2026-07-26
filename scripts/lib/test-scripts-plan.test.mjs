import assert from 'node:assert/strict';
import test from 'node:test';

import { GROUPS, groupOf, planTestRun } from './test-scripts-plan.mjs';

const FILES = [
  'scripts/secret-redact.test.mjs',
  'scripts/lib/movement-mode.test.mjs',
  'scripts/pr-ship.test.mjs',
  'scripts/morning-ritual.test.mjs',
  'scripts/task-registry.test.mjs',
];

test('planTestRun: без группы гоняет всё, отсортированно', () => {
  const { run, skipped, group } = planTestRun({ files: [...FILES].reverse() });
  assert.equal(group, null);
  assert.deepEqual(run, [...FILES].sort());
  assert.deepEqual(skipped, []);
});

test('planTestRun: исключение уходит в skipped с причиной, а не молча выпадает', () => {
  const skips = { 'scripts/pr-ship.test.mjs': 'флейк на CI, разбор в #999' };
  const { run, skipped } = planTestRun({ files: FILES, skips });
  assert.ok(!run.includes('scripts/pr-ship.test.mjs'));
  assert.deepEqual(skipped, [{ file: 'scripts/pr-ship.test.mjs', reason: 'флейк на CI, разбор в #999' }]);
  // Инвариант: сумма сохраняется — файл либо в прогоне, либо назван исключённым.
  assert.equal(run.length + skipped.length, FILES.length);
});

test('planTestRun: фильтр по группе не прячет файлы из других групп молча', () => {
  const { run, group } = planTestRun({ files: FILES, group: 'security' });
  assert.equal(group, 'security');
  assert.deepEqual(run, ['scripts/secret-redact.test.mjs']);
  // Полный прогон (test:scripts без группы) остаётся источником правды.
  assert.equal(planTestRun({ files: FILES }).run.length, FILES.length);
});

test('planTestRun: неизвестная группа — явная ошибка, а не пустой зелёный прогон', () => {
  assert.throws(() => planTestRun({ files: FILES, group: 'securiti' }), /неизвестная группа/u);
});

test('группы покрывают набор целиком и не пересекаются', () => {
  const seen = new Set();
  let sum = 0;
  for (const g of GROUPS) {
    for (const f of planTestRun({ files: FILES, group: g }).run) {
      assert.ok(!seen.has(f), `${f} в двух группах`);
      seen.add(f);
      sum += 1;
    }
  }
  assert.equal(sum, FILES.length);
});

test('groupOf: правила проверяются по порядку — security выигрывает у остального', () => {
  // Файл про секреты в ритуальном контуре обязан попасть в security: это приоритет разбора,
  // а не вкус. Обратный порядок спрятал бы секрет-тесты внутри 69 ритуальных.
  assert.equal(groupOf('scripts/ritual-secret-scan.test.mjs'), 'security');
  assert.equal(groupOf('scripts/что-угодно-иное.test.mjs'), 'domain');
});
