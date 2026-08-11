import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildExamplesCoverage,
  exampleDedupeKey,
  exampleProblems,
  parseExamplesText,
  renderExamplesCoverage,
} from './lib/workflow-examples.mjs';
import { readLiveBaseline, runWorkflowExamples } from './workflow-examples.mjs';

const CTX = {
  workshops: new Set(['docs/tasks', 'scripts']),
  procedures: new Set(['ritual-day', 'one-shot']),
  sourceExists: (rel) => rel !== 'docs/нет-такого.md',
};

function rec(over = {}) {
  return {
    objectType: 'procedure',
    objectId: 'ritual-day',
    evidenceKind: 'run',
    source: 'docs/procedure-runs/trail/2026-08-08.jsonl',
    measuredAt: '2026-08-08',
    input: 'yarn ritual:day',
    expected: 'close pass',
    observed: 'pass 07:50Z',
    verification: 'grep по ленте',
    ...over,
  };
}

test('exampleProblems: контракт полей, живой baseline, существующий source', () => {
  assert.deepEqual(exampleProblems(rec(), CTX), []);
  assert.ok(exampleProblems(rec({ observed: '' }), CTX).length > 0);
  assert.ok(exampleProblems(rec({ evidenceKind: 'demo' }), CTX)[0].includes('evidenceKind'));
  assert.ok(exampleProblems(rec({ objectId: 'призрак' }), CTX)[0].includes('не найден в живом источнике'));
  assert.ok(
    exampleProblems(rec({ source: 'docs/нет-такого.md' }), CTX)[0].includes('не существует'),
  );
  assert.ok(exampleProblems(rec({ measuredAt: 'вчера' }), CTX)[0].includes('measuredAt'));
});

test('coverage: run+boundary|failure покрывает; fixture не двигает; дубликат следа не раздувает', () => {
  const baseline = { workshops: ['docs/tasks'], procedures: ['ritual-day', 'one-shot'] };
  const records = [
    rec(),
    rec({ evidenceKind: 'failure', source: 'docs/procedure-runs/trail/2026-08-11.jsonl' }),
    rec(), // дубликат того же следа
    rec({ objectId: 'one-shot', evidenceKind: 'fixture' }),
  ];
  const cov = buildExamplesCoverage(baseline, records);
  assert.equal(cov.covered.procedures, 1);
  assert.equal(cov.covered.workshops, 0);
  assert.equal(cov.duplicates.length, 1);
  const oneShot = cov.rows.find((r) => r.objectId === 'one-shot');
  assert.equal(oneShot.run, 0);
  assert.equal(oneShot.fixture, 1);
  assert.equal(oneShot.covered, false);
  // 0/N видимы: непокрытый объект — строкой таблицы
  const md = renderExamplesCoverage(cov).join('\n');
  assert.match(md, /workshop:docs\/tasks \| 0 \| 0 \| 0 \| —/u);
});

test('parseExamplesText: комментарии пропускаются, битые строки — проблемой', () => {
  const { records, problems } = parseExamplesText('# шапка\n{"a":1}\nне json\n');
  assert.equal(records.length, 1);
  assert.equal(problems.length, 1);
});

test('живой прогон: baseline читается из источников, записи дома валидны', () => {
  const baseline = readLiveBaseline(process.cwd());
  assert.ok(baseline.workshops.length >= 10, `workshops: ${baseline.workshops.length}`);
  assert.ok(baseline.procedures.length >= 20, `procedures: ${baseline.procedures.length}`);
  const lines = [];
  const code = runWorkflowExamples([], { cwd: process.cwd(), log: (s) => lines.push(s) });
  assert.equal(code, 0, lines.join('\n'));
  assert.ok(lines.some((l) => l.includes('coverage: workshops')));
});

test('exampleDedupeKey стабилен по четвёрке полей', () => {
  assert.equal(exampleDedupeKey(rec()), exampleDedupeKey(rec({ observed: 'другое' })));
  assert.notEqual(exampleDedupeKey(rec()), exampleDedupeKey(rec({ evidenceKind: 'failure' })));
});
