import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  appendFrictionAmend,
  appendProcedureRunRecord,
  buildProcedureRunRecord,
  closeProcedureRun,
  findUnclosedRuns,
  nextSequenceOf,
  openProcedureRun,
  readProcedureRunTrail,
  summarizeProcedureRunTrail,
  validateProcedureRunRecord,
} from './lib/procedure-run-journal.mjs';

function tempRepo() {
  return mkdtempSync(join(tmpdir(), 'procedure-run-journal-'));
}

test('builds a pass record with evidence and stable ledger leaf', () => {
  const record = buildProcedureRunRecord(
    {
      procedureId: 'ritual-evening',
      runId: 'ritual-evening-2026-08-01',
      status: 'pass',
      subject: 'evening delivery frame covered generated artifacts',
      evidence: ['docs/archive/daily-day/2026-07-31/audit.md'],
    },
    { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
  );
  assert.equal(record.schema, 'procedure-run-journal@1');
  assert.match(record.ledger.leafHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateProcedureRunRecord(record), []);
});

test('pass without evidence is rejected', () => {
  assert.throws(
    () =>
      buildProcedureRunRecord(
        {
          procedureId: 'code-review',
          runId: 'code-review-2026-08-01',
          status: 'pass',
          subject: 'review covered the day',
        },
        { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
      ),
    /pass record must name at least one evidence item/,
  );
});

test('blocked record can carry a named gap', () => {
  const record = buildProcedureRunRecord(
    {
      procedureId: 'ritual-evening',
      runId: 'delivery-frame-2026-08-01',
      status: 'blocked',
      subject: 'deliver handoff to neighbors',
      gaps: ['bridge digest missing for a day without bridge'],
    },
    { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
  );
  assert.deepEqual(validateProcedureRunRecord(record), []);
  assert.equal(record.coverage.gaps[0], 'bridge digest missing for a day without bridge');
});

test('append and read JSONL trail', () => {
  const root = tempRepo();
  try {
    const trail = 'docs/procedure-runs/trail/2026-08-01.jsonl';
    const one = buildProcedureRunRecord(
      {
        procedureId: 'membrana-local-sprint',
        runId: 'procedure-run-journal-f1',
        status: 'pass',
        subject: 'OPEN and registry frame exist',
        evidence: ['docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md'],
      },
      { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
    );
    appendProcedureRunRecord(root, trail, one);
    const text = readFileSync(join(root, trail), 'utf8');
    assert.equal(text.split('\n').filter(Boolean).length, 1);
    assert.deepEqual(readProcedureRunTrail(root, trail), [one]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('summary names gaps instead of hiding behind counts', () => {
  const records = [
    buildProcedureRunRecord(
      {
        procedureId: 'procedure-x',
        runId: 'run-1',
        status: 'blocked',
        subject: 'cover subject',
        gaps: ['missing artifact'],
      },
      { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
    ),
  ];
  const summary = summarizeProcedureRunTrail(records);
  assert.equal(summary.blocked, 1);
  assert.deepEqual(summary.gaps, [{ procedureId: 'procedure-x', runId: 'run-1', gap: 'missing artifact' }]);
});

test('summary rejects unreadable input instead of inventing counters', () => {
  assert.throws(() => summarizeProcedureRunTrail(null), /records must be an array/);
  assert.throws(() => summarizeProcedureRunTrail([{ status: 'unknown', coverage: { gaps: [] } }]), /records\[0\]\.status/);
  assert.throws(() => summarizeProcedureRunTrail([{ status: 'pass', coverage: { gaps: 'oops' } }]), /coverage\.gaps/);
});

// ── фазы прогона, трение, ленивое закрытие (спринт run-journal-producer, блок 1) ──

const BASE = Object.freeze({
  procedureId: 'ritual-day',
  runId: 'ritual-day-2026-08-03',
  status: 'pass',
  subject: 'базовая запись для зубов фаз',
  at: '2026-08-03T06:00:00.000Z',
  sequence: 1,
  evidence: ['docs/MAIN_DAY_ISSUE.md'],
});

test('friction без симптома — throw: трение без симптома не наблюдение, а мнение', () => {
  assert.throws(
    () => buildProcedureRunRecord({ ...BASE, friction: [{ root: 'причина без симптома' }] }),
    /symptom обязателен/u,
  );
});

test('friction с одним симптомом валиден; корень, фикс и профилактика — nullable-долг', () => {
  const r = buildProcedureRunRecord({ ...BASE, friction: [{ symptom: 'pr:ship упал на пустом коммите' }] });
  assert.deepEqual(r.friction, [
    { symptom: 'pr:ship упал на пустом коммите', root: null, fix: null, prevention: null },
  ]);
  assert.deepEqual(validateProcedureRunRecord(r), []);
});

test('started и open неразделимы: статус старта только у открывающей записи', () => {
  assert.throws(() => buildProcedureRunRecord({ ...BASE, status: 'started' }), /только у записи runPhase: open/u);
  assert.throws(
    () => buildProcedureRunRecord({ ...BASE, status: 'pass', runPhase: 'open' }),
    /подменой семантики/u,
  );
  assert.throws(
    () => buildProcedureRunRecord({ ...BASE, status: 'started', runPhase: 'open', evidence: [] }),
    /старт прогона доказывается/u,
  );
});

test('старые записи без runPhase читаются как закрытые — сиротами не становятся', () => {
  const legacy = buildProcedureRunRecord(BASE);
  assert.deepEqual(findUnclosedRuns([legacy]), []);
});

test('ленивое закрытие: следующий open той же процедуры закрывает сироту fail/orphaned со ссылкой', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  openProcedureRun(dir, rel, {
    procedureId: 'ritual-day', runId: 'day-1', subject: 'утро началось',
    at: '2026-08-03T06:00:00.000Z', evidence: ['docs/MAIN_DAY_ISSUE.md'],
  });
  const { orphansClosed } = openProcedureRun(dir, rel, {
    procedureId: 'ritual-day', runId: 'day-2', subject: 'утро следующего дня',
    at: '2026-08-04T06:00:00.000Z', evidence: ['docs/MAIN_DAY_ISSUE.md'],
  });
  assert.equal(orphansClosed.length, 1);
  const orphan = orphansClosed[0];
  assert.equal(orphan.runId, 'day-1');
  assert.equal(orphan.status, 'fail');
  assert.deepEqual(orphan.coverage.gaps, ['orphaned']);
  assert.deepEqual(orphan.orphanedBy, { runId: 'day-2', sequence: 1 });
  assert.equal(orphan.sequence, 2, 'счёт сироты продолжается, не обнуляется');
  assert.deepEqual(validateProcedureRunRecord(orphan), [], 'leafHash сироты валиден');
});

test('чужая процедура сироту НЕ закрывает: обрыв утра не хоронится вечером', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  openProcedureRun(dir, rel, {
    procedureId: 'ritual-day', runId: 'day-1', subject: 'утро',
    at: '2026-08-03T06:00:00.000Z', evidence: ['e'],
  });
  const { orphansClosed } = openProcedureRun(dir, rel, {
    procedureId: 'ritual-evening', runId: 'eve-1', subject: 'вечер',
    at: '2026-08-03T18:00:00.000Z', evidence: ['e'],
  });
  assert.deepEqual(orphansClosed, []);
  assert.equal(findUnclosedRuns(readProcedureRunTrail(dir, rel), 'ritual-day').length, 1);
});

test('close закрывает открытое; закрыть неоткрытое или дважды — throw', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  assert.throws(() => closeProcedureRun(dir, rel, {
    runId: 'ghost', status: 'pass', subject: 's', at: '2026-08-03T07:00:00.000Z', evidence: ['e'],
  }), /закрыть нечего/u);

  openProcedureRun(dir, rel, {
    procedureId: 'ritual-day', runId: 'day-1', subject: 'утро',
    at: '2026-08-03T06:00:00.000Z', evidence: ['e'],
  });
  const close = closeProcedureRun(dir, rel, {
    runId: 'day-1', status: 'pass', subject: 'утро довезено',
    at: '2026-08-03T07:00:00.000Z', evidence: ['документы в стволе'],
    friction: [{ symptom: 'гейт магистрали подал вчерашний выбор' }],
  });
  assert.equal(close.runPhase, 'close');
  assert.equal(close.sequence, 2);
  assert.equal(close.friction[0].root, null, 'корень — долг, не выдумка');

  assert.throws(() => closeProcedureRun(dir, rel, {
    runId: 'day-1', status: 'pass', subject: 'ещё раз', at: '2026-08-03T08:00:00.000Z', evidence: ['e'],
  }), /второе закрытие было бы второй правдой/u);
});

test('амандмент дописывает корень отдельной записью; исходная НЕ мутирована', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  openProcedureRun(dir, rel, {
    procedureId: 'ritual-day', runId: 'day-1', subject: 'утро',
    at: '2026-08-03T06:00:00.000Z', evidence: ['e'],
  });
  closeProcedureRun(dir, rel, {
    runId: 'day-1', status: 'pass', subject: 'закрыт',
    at: '2026-08-03T07:00:00.000Z', evidence: ['e'],
    friction: [{ symptom: 'магистраль перенесена генератором' }],
  });
  const amend = appendFrictionAmend(dir, rel, {
    runId: 'day-1', sequence: 2, frictionIndex: 0,
    root: 'morning-gates-state не сбрасывает день',
    at: '2026-08-04T09:00:00.000Z', evidence: ['разбор 04.08'],
  });
  assert.equal(amend.runPhase, 'friction-amend');
  assert.equal(amend.sequence, 3);
  assert.deepEqual(amend.amends, { runId: 'day-1', sequence: 2, frictionIndex: 0 });
  const trail = readProcedureRunTrail(dir, rel);
  assert.equal(trail[1].friction[0].root, null, 'обе версии видны по времени');
});

test('амандмент в пустоту — throw: на запись, на индекс, и без содержания', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  openProcedureRun(dir, rel, {
    procedureId: 'p', runId: 'r-1', subject: 's', at: '2026-08-03T06:00:00.000Z', evidence: ['e'],
  });
  assert.throws(() => appendFrictionAmend(dir, rel, {
    runId: 'ghost', sequence: 1, frictionIndex: 0, root: 'x', at: '2026-08-03T07:00:00.000Z', evidence: ['e'],
  }), /нет/u);
  assert.throws(() => appendFrictionAmend(dir, rel, {
    runId: 'r-1', sequence: 1, frictionIndex: 0, root: 'x', at: '2026-08-03T07:00:00.000Z', evidence: ['e'],
  }), /friction\[0\]/u);
  assert.throws(
    () => buildProcedureRunRecord({
      ...BASE, status: 'pass', runPhase: 'friction-amend',
      amends: { runId: 'r', sequence: 1, frictionIndex: 0 },
    }),
    /без содержания/u,
  );
});

test('переоткрытие ТОГО ЖЕ runId после обрыва: номера не сталкиваются, ссылка точна', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  openProcedureRun(dir, rel, {
    procedureId: 'p', runId: 'r-1', subject: 'первый заход',
    at: '2026-08-03T06:00:00.000Z', evidence: ['e'],
  });
  const { record, orphansClosed } = openProcedureRun(dir, rel, {
    procedureId: 'p', runId: 'r-1', subject: 'переоткрытие',
    at: '2026-08-03T08:00:00.000Z', evidence: ['e'],
  });
  assert.equal(orphansClosed[0].sequence, 2, 'close-сирота заняла второй номер');
  assert.equal(record.sequence, 3, 'open переоткрытия — третий');
  assert.deepEqual(orphansClosed[0].orphanedBy, { runId: 'r-1', sequence: 3 }, 'ссылка на настоящий номер');
});

test('амандмент без evidence — понятный throw, не generic pass-without-evidence', () => {
  assert.throws(
    () => buildProcedureRunRecord({
      ...BASE, status: 'pass', runPhase: 'friction-amend', evidence: [],
      amends: { runId: 'r', sequence: 1, frictionIndex: 0 }, root: 'найденный корень',
    }),
    /доказывается разбором, не словом/u,
  );
});

test('nextSequenceOf выдерживает ленту, на которой spread лёг бы стеком', () => {
  const big = Array.from({ length: 200_000 }, (_, i) => ({ runId: 'r', sequence: i + 1 }));
  assert.equal(nextSequenceOf(big, 'r'), 200_001);
});

test('коллизия runId (#1693): open ПОСЛЕ close виден незакрытым, close закрывает семью разом', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  const put = (over) => appendProcedureRunRecord(dir, rel, buildProcedureRunRecord({
    procedureId: 'p', runId: 'p-2026-08-04', subject: 's', evidence: ['e'], ...over,
  }));
  put({ sequence: 1, status: 'started', runPhase: 'open', at: '2026-08-04T05:00:00.000Z' });
  put({ sequence: 2, status: 'fail', runPhase: 'close', gaps: ['orphaned'], at: '2026-08-04T05:10:00.000Z' });
  put({ sequence: 3, status: 'started', runPhase: 'open', at: '2026-08-04T06:00:00.000Z' });
  put({ sequence: 4, status: 'started', runPhase: 'open', at: '2026-08-04T06:30:00.000Z' });

  const unclosed = findUnclosedRuns(readProcedureRunTrail(dir, rel), 'p');
  assert.equal(unclosed.length, 2, 'open seq 3 и 4 живы: close seq 2 их не хоронит');

  const close = closeProcedureRun(dir, rel, {
    runId: 'p-2026-08-04', status: 'pass', subject: 'финал состоявшегося прогона',
    at: '2026-08-04T07:00:00.000Z', evidence: ['docs/MAIN_DAY_ISSUE.md'],
  });
  assert.equal(close.sequence, 5, 'закрытие — одно событие поверх семьи');
  assert.equal(findUnclosedRuns(readProcedureRunTrail(dir, rel), 'p').length, 0, 'семья закрыта целиком');
  assert.throws(
    () => closeProcedureRun(dir, rel, {
      runId: 'p-2026-08-04', status: 'pass', subject: 'x',
      at: '2026-08-04T08:00:00.000Z', evidence: ['e'],
    }),
    /уже закрыт/u,
  );
});

test('ленивое закрытие коллидировавшей семьи — ОДНА close-запись, не по числу open (#1693)', () => {
  const dir = tempRepo();
  const rel = 'trail/t.jsonl';
  const put = (over) => appendProcedureRunRecord(dir, rel, buildProcedureRunRecord({
    procedureId: 'p', runId: 'p-2026-08-04', subject: 's', evidence: ['e'], ...over,
  }));
  put({ sequence: 1, status: 'started', runPhase: 'open', at: '2026-08-04T05:00:00.000Z' });
  put({ sequence: 2, status: 'started', runPhase: 'open', at: '2026-08-04T06:00:00.000Z' });

  const { orphansClosed } = openProcedureRun(dir, rel, {
    procedureId: 'p', runId: 'p-2026-08-04-r3', subject: 'новая попытка',
    at: '2026-08-04T07:00:00.000Z', evidence: ['e'],
  });
  assert.equal(orphansClosed.length, 1, 'одна fail/orphaned на семью — второй close был бы второй правдой');
  assert.equal(orphansClosed[0].runId, 'p-2026-08-04');
});
