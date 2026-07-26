/**
 * Мета-гвард покрытия: ни один `*.test.mjs` под `scripts/**` не остаётся вне прогона.
 *
 * ИСТОРИЯ РЕШЕНИЯ. 17.07 (заседание scripts-boundary) выбрали РУЧНОЙ список `test:scripts`
 * с обоснованием «явный список — сознательный контроль, флейки можно исключить строкой»,
 * а этот гвард держал его честным. Цели были две: не иметь молчаливых сирот и уметь
 * исключать осознанно.
 *
 * ЧТО ПОШЛО НЕ ТАК. Гвард читал только верхний уровень `scripts/`, поэтому 11 тестов в
 * `scripts/lib/**` (81 проверка) не гонялись в CI вообще — ровно тот дефект, от которого он
 * защищал, на каталог глубже. Плюс сама строка из 210 путей стала файлом-перекрёстком:
 * 26.07 четыре конфликта подряд (PR #1248, #1253, #1269, #1283).
 *
 * ЧТО ТЕПЕРЬ. Набор берётся ОТКРЫТИЕМ по дереву (сирота невозможна), исключение осталось,
 * но обязано нести причину. Оба требования 17.07 сохранены, дыра закрыта.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { GROUPS, groupOf, planTestRun, SKIP_WITH_REASON } from './lib/test-scripts-plan.mjs';
import { discoverTestFiles } from './test-scripts-run.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

test('test:scripts делегирует раннеру, а не хранит список путей', () => {
  const cmd = pkg.scripts['test:scripts'];
  assert.match(cmd, /test-scripts-run\.mjs/u);
  assert.ok(!/\.test\.mjs\s+scripts\//u.test(cmd), 'список путей вернулся в package.json — перекрёсток восстановлен');
});

test('открытие рекурсивное: тесты в scripts/lib/** попадают в прогон', () => {
  const files = discoverTestFiles();
  assert.ok(files.some((f) => f.startsWith('scripts/lib/')), 'подкаталоги снова невидимы — тот самый дефект');
  assert.ok(files.every((f) => f.endsWith('.test.mjs')));
  assert.ok(files.length > 200, `ожидалось >200 тестов, найдено ${files.length}`);
});

test('ни один файл не теряется молча: run ∪ skipped = всё, что на диске', () => {
  const files = discoverTestFiles();
  const { run, skipped } = planTestRun({ files });
  const covered = new Set([...run, ...skipped.map((s) => s.file)]);
  const lost = files.filter((f) => !covered.has(f));
  assert.deepEqual(lost, [], `файлы вне плана (не гоняются и не исключены явно): ${lost.join(', ')}`);
  assert.equal(covered.size, new Set(files).size);
});

test('каждое исключение несёт непустую причину', () => {
  for (const [file, reason] of Object.entries(SKIP_WITH_REASON)) {
    assert.equal(typeof reason, 'string');
    assert.ok(reason.trim().length > 10, `исключение ${file} без внятной причины — через месяц не отличить от забытого файла`);
  }
});

test('группы разбивают набор без пересечений и без остатка', () => {
  const files = discoverTestFiles();
  const byGroup = GROUPS.map((g) => planTestRun({ files, group: g }).run);
  const sum = byGroup.reduce((n, list) => n + list.length, 0);
  const all = planTestRun({ files }).run.length;
  assert.equal(sum, all, 'сумма групп ≠ общему набору: файл попал в две группы или ни в одну');
  const seen = new Set();
  for (const list of byGroup) {
    for (const f of list) {
      assert.ok(!seen.has(f), `${f} попал в две группы`);
      seen.add(f);
    }
  }
});

test('каждая группа из package.json существует в ядре плана', () => {
  for (const key of Object.keys(pkg.scripts)) {
    const m = key.match(/^test:scripts:(?!list$)(.+)$/u);
    if (m) assert.ok(GROUPS.includes(m[1]), `скрипт ${key} ссылается на несуществующую группу`);
  }
  for (const g of GROUPS) {
    assert.ok(pkg.scripts[`test:scripts:${g}`], `нет ярлыка test:scripts:${g}`);
  }
});

test('groupOf детерминирован и не зависит от регистра пути', () => {
  assert.equal(groupOf('scripts/secret-redact.test.mjs'), 'security');
  assert.equal(groupOf('scripts/morning-ritual.test.mjs'), 'rituals');
  assert.equal(groupOf('scripts/task-registry.test.mjs'), 'tasks');
  assert.equal(groupOf('scripts/pr-ship.test.mjs'), 'repo');
  assert.equal(groupOf('scripts/lib/movement-mode.test.mjs'), 'domain');
});
