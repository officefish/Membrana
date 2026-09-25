// #2081 хвост: находки вечера (deliver-to-main pending-ci, exit 3) попадают в журнал прогона.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { eveningCloseArgs } from './lib/ritual-evening-close-args.mjs';

test('находка pending-ci пишется во friction, статус остаётся pass', () => {
  const args = eveningCloseArgs({
    failed: [],
    findings: [{ id: 'deliver-to-main', exitCode: 3 }],
  });
  assert.equal(args[args.indexOf('--status') + 1], 'pass');
  assert.ok(args.includes('--friction'), 'находка не дошла до журнала — сирота');
  assert.equal(args[args.indexOf('--friction') + 1], 'deliver-to-main: finding exit 3');
  assert.ok(!args.includes('--gap'));
});

test('упавший критичный шаг — fail с gap; находки рядом не теряются', () => {
  const args = eveningCloseArgs({
    failed: [{ id: 'evening-tail' }],
    findings: [{ id: 'insight-drift', exitCode: 3 }],
  });
  assert.equal(args[args.indexOf('--status') + 1], 'fail');
  assert.deepEqual(args.slice(args.indexOf('--gap'), args.indexOf('--gap') + 2), ['--gap', 'evening-tail']);
  assert.ok(args.includes('insight-drift: finding exit 3'));
});

test('порча: без находок и без падений — чистый pass без friction/gap', () => {
  const args = eveningCloseArgs({ failed: [], findings: [] });
  assert.deepEqual(args, ['close', '--procedure', 'ritual-evening', '--status', 'pass', '--evidence', 'docs/HANDOFF.md']);
});

// ── #2413: ложное благополучие — вечер с отказами, у которого ноль трений ──────────
//
// КРАСНЫЙ ВХОД этого зуба — не выдумка, а вечер 2026-09-24 дословно:
//   status=fail, gaps=[code-review, archive-code-review, deliver-to-main],
//   friction=[«archive-night-hunt: finding exit 3», «leveling-workspace: …», «day-memo: …»]
// Три критичных отказа не оставили ни одного трения; три трения, что в ленте есть,
// рождены находками exit 3 — то есть шагами, которые НЕ падали.

const frictionsOf = (args) => args.flatMap((a, i) => (a === '--friction' ? [args[i + 1]] : []));
const gapsOf = (args) => args.flatMap((a, i) => (a === '--gap' ? [args[i + 1]] : []));

test('#2413 вечер 24.09: у каждого ОТКАЗА рождается своё трение, а не только gap', () => {
  const args = eveningCloseArgs({
    failed: [
      { id: 'code-review', exitCode: 1 },
      { id: 'archive-code-review', exitCode: 1 },
      { id: 'deliver-to-main', exitCode: 1 },
    ],
    findings: [
      { id: 'archive-night-hunt', exitCode: 3 },
      { id: 'leveling-workspace', exitCode: 3 },
      { id: 'day-memo', exitCode: 3 },
    ],
  });
  assert.equal(args[args.indexOf('--status') + 1], 'fail');
  const gaps = gapsOf(args);
  const frictions = frictionsOf(args);
  assert.deepEqual(gaps, ['code-review', 'archive-code-review', 'deliver-to-main']);
  // До починки здесь было ровно 3 трения — все от находок, ни одного от трёх отказов.
  assert.equal(frictions.length, 6, `отказ не родил трения: ${JSON.stringify(frictions)}`);
  for (const id of gaps) {
    assert.ok(
      frictions.some((f) => f.startsWith(`${id}:`)),
      `gap «${id}» записан, трения по нему нет — дайджест насчитает ноль непогашенных`,
    );
  }
});

test('#2413 отказ и находка различимы в ленте БЕЗ обращения к gaps', () => {
  const args = eveningCloseArgs({
    failed: [{ id: 'code-review', exitCode: 1 }],
    findings: [{ id: 'day-memo', exitCode: 3 }],
  });
  const frictions = frictionsOf(args);
  assert.match(frictions[0], /^code-review: отказ шага, exit 1/u);
  assert.match(frictions[1], /^day-memo: finding exit 3$/u);
  assert.ok(!frictions[0].includes('finding'), 'отказ, названный находкой, — та же ложь, только тише');
});

test('#2413 порядок трений фиксирован: отказы, затем находки (адрес амандмента)', () => {
  const args = eveningCloseArgs({
    failed: [
      { id: 'a', exitCode: 1 },
      { id: 'b', exitCode: 2 },
    ],
    findings: [{ id: 'c', exitCode: 3 }],
  });
  assert.deepEqual(
    frictionsOf(args).map((f) => f.split(':')[0]),
    ['a', 'b', 'c'],
    'frictionIndex — адрес поправки; плавающий порядок делает амандмент неадресуемым',
  );
});
