/**
 * Зубы команды дозаписи трения (сессия E, 23.09).
 *
 * Предмет: фаза `friction-amend` в библиотеке журнала есть с рождения, а команды, которая
 * её пишет, в `scripts/` не было — корень трения оставался в голове того, кто его понял.
 *
 * Лента append-only: зубы проверяют не только, что строка дописана, но и что прежние
 * строки остались побайтно теми же.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseFrictionArgs, selectFrictionTarget, runFrictionAmend } from './procedure-run-friction.mjs';
import { closeProcedureRun, openProcedureRun, readProcedureRunTrail } from './lib/procedure-run-journal.mjs';

const TRAIL = 'trail.jsonl';

/** Лента с одним закрытым прогоном и двумя шероховатостями — вход для амандмента. */
function makeTrail() {
  const root = mkdtempSync(join(tmpdir(), 'friction-teeth-'));
  openProcedureRun(root, TRAIL, {
    procedureId: 'ritual-day',
    runId: 'ritual-day-test',
    subject: 'прогон ritual-day',
    at: '2026-09-23T06:00:00.000Z',
    evidence: ['docs/tasks/evening-ritual-steps.json'],
    lazyCloseScope: 'run',
  });
  closeProcedureRun(root, TRAIL, {
    runId: 'ritual-day-test',
    status: 'fail',
    subject: 'прогон ritual-day закрыт: fail',
    at: '2026-09-23T06:30:00.000Z',
    evidence: ['docs/MAIN_DAY_ISSUE.md'],
    friction: [
      { symptom: 'стендап упал panel_unreachable при живом офисе' },
      { symptom: 'второй прогон утра, коллизия sequence' },
    ],
  });
  return root;
}

const EVIDENCE = 'docs/procedure-runs/trail/2026-09-23.jsonl';

// ─── разбор доводов ───────────────────────────────────────────────────────────────────

test('parseFrictionArgs: собирает прогон, симптом, корень и несколько вещдоков', () => {
  const args = parseFrictionArgs([
    '--run', 'ritual-day-test',
    '--symptom', 'panel_unreachable',
    '--root', 'панель не ответила на первый запрос',
    '--evidence', 'a.jsonl',
    '--evidence', 'b.md',
  ]);
  assert.equal(args.run, 'ritual-day-test');
  assert.equal(args.symptom, 'panel_unreachable');
  assert.equal(args.root, 'панель не ответила на первый запрос');
  assert.deepEqual(args.evidence, ['a.jsonl', 'b.md']);
});

// ─── выбор целевой шероховатости ──────────────────────────────────────────────────────

test('selectFrictionTarget: симптом подстрокой находит запись и индекс', () => {
  const records = readProcedureRunTrail(makeTrail(), TRAIL);
  const target = selectFrictionTarget(records, { run: 'ritual-day-test', symptom: 'panel_unreachable' });
  assert.equal(target.runId, 'ritual-day-test');
  assert.equal(target.sequence, 2);
  assert.equal(target.frictionIndex, 0);
});

test('selectFrictionTarget: симптома в ленте нет — отказ называет, что есть', () => {
  const records = readProcedureRunTrail(makeTrail(), TRAIL);
  assert.throws(
    () => selectFrictionTarget(records, { run: 'ritual-day-test', symptom: 'deliver-to-main' }),
    /симптом[^]*не найден|нет шероховатости/iu,
  );
});

test('selectFrictionTarget: симптом подходит к двум — отказ, а не догадка', () => {
  const records = readProcedureRunTrail(makeTrail(), TRAIL);
  assert.throws(() => selectFrictionTarget(records, { run: 'ritual-day-test', symptom: 'о' }), /неоднознач/iu);
});

test('selectFrictionTarget: прогона нет — отказ', () => {
  const records = readProcedureRunTrail(makeTrail(), TRAIL);
  assert.throws(() => selectFrictionTarget(records, { run: 'ritual-evening-test', symptom: 'что-то' }), /прогон/iu);
});

// ─── дозапись ─────────────────────────────────────────────────────────────────────────

test('runFrictionAmend: строка дописана, форма фазы friction-amend, прежние строки нетронуты', () => {
  const root = makeTrail();
  const before = readFileSync(join(root, TRAIL), 'utf8');
  const beforeLines = before.split('\n').filter(Boolean);

  const record = runFrictionAmend({
    repoRoot: root,
    trail: TRAIL,
    args: {
      run: 'ritual-day-test',
      symptom: 'panel_unreachable',
      root: 'панель офиса не ответила на первый запрос стендапа; повтор прошёл',
      prevention: 'зуб на повтор запроса к панели в утреннем прогоне',
      evidence: [EVIDENCE],
    },
    nowIso: '2026-09-23T12:00:00.000Z',
  });

  assert.equal(record.runPhase, 'friction-amend');
  assert.equal(record.status, 'pass');
  assert.deepEqual(record.amends, { runId: 'ritual-day-test', sequence: 2, frictionIndex: 0 });
  assert.match(record.root, /панель офиса не ответила/u);
  assert.equal(record.prevention, 'зуб на повтор запроса к панели в утреннем прогоне');
  assert.equal(record.sequence, 3, 'sequence прогона растёт монотонно');

  const after = readFileSync(join(root, TRAIL), 'utf8');
  const afterLines = after.split('\n').filter(Boolean);
  assert.equal(afterLines.length, beforeLines.length + 1, 'дописана ровно одна строка');
  assert.equal(after.startsWith(before), true, 'append-only: прежние строки побайтно те же');
  assert.deepEqual(afterLines.slice(0, beforeLines.length), beforeLines);

  const written = JSON.parse(afterLines[afterLines.length - 1]);
  assert.equal(written.runPhase, 'friction-amend');
  assert.deepEqual(written.coverage.evidence, [EVIDENCE]);
  assert.match(written.subject, /panel_unreachable/u, 'симптом виден в предмете амандмента');
});

test('runFrictionAmend: без вещдока — отказ, лента не тронута', () => {
  const root = makeTrail();
  const before = readFileSync(join(root, TRAIL), 'utf8');
  assert.throws(
    () =>
      runFrictionAmend({
        repoRoot: root,
        trail: TRAIL,
        args: { run: 'ritual-day-test', symptom: 'panel_unreachable', root: 'корень без разбора', evidence: [] },
        nowIso: '2026-09-23T12:00:00.000Z',
      }),
    /evidence/iu,
  );
  assert.equal(readFileSync(join(root, TRAIL), 'utf8'), before, 'отказ не пишет в ленту');
});

test('runFrictionAmend: без содержания (ни корня, ни фикса, ни профилактики) — отказ', () => {
  const root = makeTrail();
  const before = readFileSync(join(root, TRAIL), 'utf8');
  assert.throws(
    () =>
      runFrictionAmend({
        repoRoot: root,
        trail: TRAIL,
        args: { run: 'ritual-day-test', symptom: 'panel_unreachable', evidence: [EVIDENCE] },
        nowIso: '2026-09-23T12:00:00.000Z',
      }),
    /root|fix|prevention|содержан/iu,
  );
  assert.equal(readFileSync(join(root, TRAIL), 'utf8'), before);
});

test('runFrictionAmend: у прогона нет ни одной шероховатости — отказ «амандмент в пустоту»', () => {
  const root = mkdtempSync(join(tmpdir(), 'friction-teeth-empty-'));
  openProcedureRun(root, TRAIL, {
    procedureId: 'ritual-day',
    runId: 'ritual-day-empty',
    subject: 'прогон ritual-day',
    at: '2026-09-22T06:00:00.000Z',
    evidence: ['docs/tasks/evening-ritual-steps.json'],
    lazyCloseScope: 'run',
  });
  closeProcedureRun(root, TRAIL, {
    runId: 'ritual-day-empty',
    status: 'fail',
    subject: 'прогон ritual-day закрыт: fail',
    at: '2026-09-22T06:30:00.000Z',
    evidence: ['docs/MAIN_DAY_ISSUE.md'],
    friction: [],
  });
  const before = readFileSync(join(root, TRAIL), 'utf8');
  assert.throws(
    () =>
      runFrictionAmend({
        repoRoot: root,
        trail: TRAIL,
        args: { run: 'ritual-day-empty', symptom: 'второй прогон утра', root: 'что-то', evidence: [EVIDENCE] },
        nowIso: '2026-09-23T12:00:00.000Z',
      }),
    /шероховатост|пустот/iu,
    'амандмент к записи с friction: [] невозможен по контракту журнала',
  );
  assert.equal(readFileSync(join(root, TRAIL), 'utf8'), before);
});

test('runFrictionAmend: сухой прогон ничего не пишет', () => {
  const root = makeTrail();
  const before = readFileSync(join(root, TRAIL), 'utf8');
  const planned = runFrictionAmend({
    repoRoot: root,
    trail: TRAIL,
    args: {
      run: 'ritual-day-test',
      symptom: 'коллизия sequence',
      root: 'два прогона утра писали в одну ленту',
      evidence: [EVIDENCE],
      dryRun: true,
    },
    nowIso: '2026-09-23T12:00:00.000Z',
  });
  assert.equal(planned.runPhase, 'friction-amend');
  assert.deepEqual(planned.amends, { runId: 'ritual-day-test', sequence: 2, frictionIndex: 1 });
  assert.equal(readFileSync(join(root, TRAIL), 'utf8'), before, 'сухой прогон ленту не трогает');
});

test('лента после двух амандментов остаётся читаемой и append-only', () => {
  const root = makeTrail();
  const args = (symptom, rootText) => ({ run: 'ritual-day-test', symptom, root: rootText, evidence: [EVIDENCE] });
  runFrictionAmend({ repoRoot: root, trail: TRAIL, args: args('panel_unreachable', 'панель молчала'), nowIso: '2026-09-23T12:00:00.000Z' });
  runFrictionAmend({ repoRoot: root, trail: TRAIL, args: args('коллизия sequence', 'два прогона в одной ленте'), nowIso: '2026-09-23T12:05:00.000Z' });
  const records = readProcedureRunTrail(root, TRAIL);
  const amends = records.filter((r) => r.runPhase === 'friction-amend');
  assert.equal(amends.length, 2);
  assert.deepEqual(amends.map((r) => r.sequence), [3, 4], 'sequence растёт, дублей нет');
  assert.deepEqual(amends.map((r) => r.amends.frictionIndex), [0, 1]);
});

// Целевая запись меняться не должна: амандмент — не мутация.
test('амандмент не правит прежнюю строку трения', () => {
  const root = makeTrail();
  const targetBefore = readProcedureRunTrail(root, TRAIL).find((r) => r.sequence === 2 && r.runPhase === 'close');
  runFrictionAmend({
    repoRoot: root,
    trail: TRAIL,
    args: { run: 'ritual-day-test', symptom: 'panel_unreachable', root: 'корень', evidence: [EVIDENCE] },
    nowIso: '2026-09-23T12:00:00.000Z',
  });
  const targetAfter = readProcedureRunTrail(root, TRAIL).find((r) => r.sequence === 2 && r.runPhase === 'close');
  assert.deepEqual(targetAfter, targetBefore, 'симптом остался в момент прогона, корень — отдельной строкой');
  assert.equal(targetAfter.friction[0].root, null, 'прежняя строка по-прежнему без корня');
});

// Служебная проверка формы: тест не должен зависеть от неверно собранного входа.
test('makeTrail: вход зубов — закрытый прогон с двумя шероховатостями', () => {
  const records = readProcedureRunTrail(makeTrail(), TRAIL);
  const close = records.find((r) => r.runPhase === 'close');
  assert.equal(close.friction.length, 2);
  assert.equal(close.friction[0].root, null);
  writeFileSync(join(tmpdir(), 'friction-teeth-marker'), 'ok', 'utf8');
});
