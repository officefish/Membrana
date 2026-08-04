/**
 * Зубы блока run-record-cli (спринт run-journal-producer, 03.08): CLI открывает и
 * закрывает прогон по procedureId через библиотеку; сам не выдумывает ни времени,
 * ни статусов; обрыв ловится лениво и ЧЕРЕЗ границу дневных файлов.
 */
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  cmdAmend,
  cmdClose,
  cmdOpen,
  datesBack,
  findOpenRunsAround,
  parseArgs,
  RefusalError,
} from './procedure-run-record.mjs';
import {
  appendProcedureRunRecord,
  buildProcedureRunRecord,
  defaultTrailPath,
  openProcedureRun,
  readProcedureRunTrail,
} from './lib/procedure-run-journal.mjs';

const tempRepo = () => mkdtempSync(join(tmpdir(), 'run-record-cli-'));
const AT_D1 = '2026-08-03T06:00:00.000Z';
const AT_D2 = '2026-08-04T06:00:00.000Z';

test('datesBack считает назад через границы месяца', () => {
  assert.deepEqual(datesBack('2026-08-02', 3), ['2026-08-01', '2026-07-31', '2026-07-30']);
});

test('open: runId по умолчанию <procedureId>-<дата события>, статус started', () => {
  const dir = tempRepo();
  const { record, trailRel } = cmdOpen(dir, {
    procedureId: 'ritual-day', at: AT_D1, evidence: ['docs/MAIN_DAY_ISSUE.md'],
  });
  assert.equal(record.runId, 'ritual-day-2026-08-03');
  assert.equal(record.status, 'started');
  assert.equal(trailRel, defaultTrailPath('2026-08-03'));
});

test('close по procedureId находит открытый прогон, runId помнить не нужно', () => {
  const dir = tempRepo();
  cmdOpen(dir, { procedureId: 'ritual-day', at: AT_D1, evidence: ['e'] });
  const { record } = cmdClose(dir, {
    procedureId: 'ritual-day', status: 'pass', at: '2026-08-03T18:00:00.000Z',
    evidence: ['артефакты дня'], friction: ['гейт подал вчерашний выбор'],
  });
  assert.equal(record.runId, 'ritual-day-2026-08-03');
  assert.equal(record.runPhase, 'close');
  assert.deepEqual(record.friction, [
    { symptom: 'гейт подал вчерашний выбор', root: null, fix: null, prevention: null },
  ]);
});

test('обрыв ловится ЧЕРЕЗ границу файлов: open завтра закрывает вчерашнюю сироту в её файле', () => {
  const dir = tempRepo();
  cmdOpen(dir, { procedureId: 'ritual-day', at: AT_D1, evidence: ['e'] });
  const { orphansClosed } = cmdOpen(dir, { procedureId: 'ritual-day', at: AT_D2, evidence: ['e'] });
  assert.equal(orphansClosed.length, 1);
  assert.equal(orphansClosed[0].runId, 'ritual-day-2026-08-03');
  assert.deepEqual(orphansClosed[0].coverage.gaps, ['orphaned']);
  const d1 = readProcedureRunTrail(dir, defaultTrailPath('2026-08-03'));
  assert.equal(d1.at(-1).runPhase, 'close', 'close-сирота живёт в файле своего open');
  assert.match(d1.at(-1).coverage.evidence[0], /ritual-day-2026-08-04/u, 'ссылка на вытеснившую — строкой в evidence (названный долг)');
  assert.equal(findOpenRunsAround(dir, 'ritual-day', '2026-08-04').length, 1, 'открыт только новый');
});

test('чужая процедура через границу файлов сироту НЕ закрывает', () => {
  const dir = tempRepo();
  cmdOpen(dir, { procedureId: 'ritual-day', at: AT_D1, evidence: ['e'] });
  const { orphansClosed } = cmdOpen(dir, { procedureId: 'ritual-evening', at: AT_D2, evidence: ['e'] });
  assert.deepEqual(orphansClosed, []);
});

test('close: нечего закрывать и «открытых несколько» — честные отказы, не выбор молча', () => {
  const dir = tempRepo();
  assert.throws(
    () => cmdClose(dir, { procedureId: 'ritual-day', status: 'pass', at: AT_D1, evidence: ['e'] }),
    RefusalError,
  );
  // Через cmdOpen два открытых одной процедуры не сосуществуют (второй закрывает
  // первого лениво) — ветка защищает от ленты, написанной МИМО CLI: кладём два open
  // библиотекой в разные дневные файлы.
  openProcedureRun(dir, defaultTrailPath('2026-08-03'), {
    procedureId: 'ritual-day', runId: 'r-a', subject: 's', at: AT_D1, evidence: ['e'],
  });
  openProcedureRun(dir, defaultTrailPath('2026-08-04'), {
    procedureId: 'ritual-day', runId: 'r-b', subject: 's', at: AT_D2, evidence: ['e'],
  });
  assert.throws(
    () => cmdClose(dir, { procedureId: 'ritual-day', status: 'pass', at: '2026-08-04T18:00:00.000Z', evidence: ['e'] }),
    /несколько.*адресуйте --run/u,
  );
  const { record } = cmdClose(dir, {
    procedureId: 'ritual-day', runId: 'r-b', status: 'pass',
    at: '2026-08-04T18:00:00.000Z', evidence: ['e'],
  });
  assert.equal(record.runId, 'r-b');
});

test('CLI не выдумывает статусов: чужое значение бросает библиотека', () => {
  const dir = tempRepo();
  cmdOpen(dir, { procedureId: 'p', at: AT_D1, evidence: ['e'] });
  assert.throws(
    () => cmdClose(dir, { procedureId: 'p', status: 'done', at: AT_D1, evidence: ['e'] }),
    /status must be one of/u,
  );
});

test('amend находит запись в ленте её дня и дописывает корень отдельной записью', () => {
  const dir = tempRepo();
  cmdOpen(dir, { procedureId: 'ritual-day', at: AT_D1, evidence: ['e'] });
  cmdClose(dir, {
    procedureId: 'ritual-day', status: 'pass', at: '2026-08-03T18:00:00.000Z',
    evidence: ['e'], friction: ['магистраль перенесена генератором'],
  });
  const { record, trailRel } = cmdAmend(dir, {
    runId: 'ritual-day-2026-08-03', sequence: 2, frictionIndex: 0,
    root: 'morning-gates-state не сбрасывает день',
    at: '2026-08-04T09:00:00.000Z', evidence: ['разбор 04.08'],
  });
  assert.equal(record.runPhase, 'friction-amend');
  assert.equal(trailRel, defaultTrailPath('2026-08-03'), 'амандмент едет в файл своего прогона');
  assert.throws(
    () => cmdAmend(dir, {
      runId: 'ghost', sequence: 1, frictionIndex: 0, root: 'x',
      at: AT_D2, evidence: ['e'],
    }),
    RefusalError,
  );
});

test('parseArgs: закрытый список команд и флагов, повторяемые копятся', () => {
  const args = parseArgs(['close', '--procedure', 'p', '--status', 'pass', '--gap', 'a', '--gap', 'b']);
  assert.deepEqual(args.gap, ['a', 'b']);
  assert.throws(() => parseArgs(['upsert']), /вне \{open\|close\|amend\}/u);
  assert.throws(() => parseArgs(['open', '--force', '1']), /неизвестный флаг/u);
});

test('days с NaN не молчит пустым промётом — throw', () => {
  assert.throws(() => datesBack('2026-08-03', Number('семь')), /non-negative integer/u);
  const dir = tempRepo();
  assert.throws(
    () => cmdOpen(dir, { procedureId: 'p', at: AT_D1, evidence: ['e'], days: Number('x') }),
    /non-negative integer/u,
  );
});

test('повторный open дня получает свой runId «-r2» и лениво закрывает первую попытку (#1693)', () => {
  const dir = tempRepo();
  const a = cmdOpen(dir, { procedureId: 'ritual-day', at: AT_D1, evidence: ['e'] });
  const b = cmdOpen(dir, { procedureId: 'ritual-day', at: '2026-08-03T07:00:00.000Z', evidence: ['e'] });
  assert.equal(a.record.runId, 'ritual-day-2026-08-03', 'первый прогон дня — без суффикса');
  assert.equal(b.record.runId, 'ritual-day-2026-08-03-r2', 'повтор — своя личность прогона');
  assert.equal(b.orphansClosed.length, 1, 'первая попытка закрыта fail/orphaned');
  assert.equal(b.orphansClosed[0].runId, 'ritual-day-2026-08-03');

  const { record } = cmdClose(dir, {
    procedureId: 'ritual-day', status: 'pass', at: '2026-08-03T18:00:00.000Z', evidence: ['ok'],
  });
  assert.equal(record.runId, 'ritual-day-2026-08-03-r2', 'close находит живую попытку');

  const c = cmdOpen(dir, { procedureId: 'ritual-day', at: '2026-08-03T20:00:00.000Z', evidence: ['e'] });
  assert.equal(c.record.runId, 'ritual-day-2026-08-03-r3', 'счёт попыток — факт истории, закрытие его не обнуляет');
});

test('коллидировавшая история: close закрывает семью одним событием, без отказа «несколько» (#1693)', () => {
  const dir = tempRepo();
  const rel = defaultTrailPath('2026-08-03');
  const put = (over) => appendProcedureRunRecord(dir, rel, buildProcedureRunRecord({
    procedureId: 'ritual-day', runId: 'ritual-day-2026-08-03', subject: 's', evidence: ['e'], ...over,
  }));
  put({ sequence: 1, status: 'started', runPhase: 'open', at: '2026-08-03T05:00:00.000Z' });
  put({ sequence: 2, status: 'fail', runPhase: 'close', gaps: ['orphaned'], at: '2026-08-03T05:10:00.000Z' });
  put({ sequence: 3, status: 'started', runPhase: 'open', at: '2026-08-03T06:00:00.000Z' });
  put({ sequence: 4, status: 'started', runPhase: 'open', at: '2026-08-03T06:30:00.000Z' });

  const { record } = cmdClose(dir, {
    procedureId: 'ritual-day', status: 'pass', at: '2026-08-03T18:00:00.000Z', evidence: ['ok'],
  });
  assert.equal(record.sequence, 5, 'семья закрыта одним событием');
  assert.equal(record.status, 'pass', 'состоявшийся день получает pass, а не вечное started');
});
