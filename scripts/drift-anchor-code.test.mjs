import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractCorpusF1, parseArgs, recordFileNames } from './drift-anchor-code.mjs';

test('extractCorpusF1 берёт только benchmarked с числовым f1', () => {
  const report = {
    detectors: [
      { name: 'harmonic', status: 'benchmarked', metrics: { f1: 0.5324675 } },
      { name: 'yamnet', status: 'benchmarked', metrics: { f1: 0.8029197 } },
      { name: 'clap', status: 'scaffold', metrics: null },
      { name: 'agentic-claude', status: 'scaffold', metrics: null },
    ],
  };
  assert.deepEqual(extractCorpusF1(report), { harmonic: 0.5324675, yamnet: 0.8029197 });
});

test('extractCorpusF1: пустой/битый отчёт → пустой объект (baseline тогда даст broken)', () => {
  assert.deepEqual(extractCorpusF1({}), {});
  assert.deepEqual(extractCorpusF1({ detectors: [{ name: 'x', status: 'benchmarked' }] }), {});
});

test('recordFileNames: датированная запись + latest на источник', () => {
  const names = recordFileNames('ci', '2026-07-13T04:00:00.000Z');
  assert.equal(names.dated, 'code-ci-2026-07-13.json');
  assert.equal(names.latest, 'code-ci-latest.json');
});

test('parseArgs: дефолт ci, schedule принимается, мусор — ошибка', () => {
  assert.equal(parseArgs([]).source, 'ci');
  assert.equal(parseArgs(['--source', 'schedule']).source, 'schedule');
  assert.throws(() => parseArgs(['--source', 'nightly']), /ci\|schedule/);
});
