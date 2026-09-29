import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROBE_CARRYING_EXPRESSIONS,
  PROBE_MODELLED_EXPORTS,
  PROBE_UNMODELLED_EXPORTS,
  ScenarioTraceProbe,
  fillSyntheticTrace,
  makeCountingSink,
  readMaxTraceLines,
  readScenarioTraceBufferExports,
  readScenarioTraceBufferSource,
  runScenarioTraceTeardownBenchmark,
} from './lib/scenario-trace-teardown-measure.mjs';

test('synthetic trace probe keeps the same ring cap semantics as scenarioTraceBuffer', () => {
  const buffer = fillSyntheticTrace(new ScenarioTraceProbe({ maxLines: 3 }), 5);

  assert.equal(buffer.getScenarioTraceLines().length, 3);
  assert.match(buffer.getScenarioTraceLines()[0], /tick: 2/);
});

test('finishStopped appends scenario-run-stop and synchronously persists joined text', () => {
  const sink = makeCountingSink();
  const buffer = fillSyntheticTrace(new ScenarioTraceProbe({ maxLines: 10, sink }), 2);

  buffer.finishStopped('run-a');

  assert.equal(sink.writes, 1);
  assert.equal(buffer.getScenarioTraceLines().length, 3);
  assert.match(buffer.getScenarioTraceText(), /scenario-run-stop/);
  assert.ok(sink.bytes > 0);
});

test('beforeUnloadPersist serializes without mutating the trace buffer', () => {
  const sink = makeCountingSink();
  const buffer = fillSyntheticTrace(new ScenarioTraceProbe({ maxLines: 10, sink }), 4);

  buffer.beforeUnloadPersist();

  assert.equal(sink.writes, 1);
  assert.equal(buffer.getScenarioTraceLines().length, 4);
});

test('benchmark returns rows for every requested size', () => {
  const rows = runScenarioTraceTeardownBenchmark({
    sizes: [1, 2],
    repeats: 2,
    warmup: 1,
    maxLines: 10,
    subscribers: 1,
  });

  assert.deepEqual(rows.map((row) => row.size), [1, 2]);
  assert.equal(rows[0].stopRecording.samples.length, 2);
  assert.equal(rows[1].exitBoard.sinkWrites, 1);
});

// --- Зуб на предмет прибора, переносимая половина (#2485) ------------------------------------
// Прибор воспроизводит логику scenarioTraceBuffer КОПИЕЙ (класс ScenarioTraceProbe). Копия
// молча разойдётся с оригиналом, и прибор начнёт мерить прошлое. Здесь предмет сверяется по
// ИСХОДНИКУ продуктового модуля: загрузчик TypeScript не нужен, поэтому зуб работает всюду,
// где идёт `yarn test:scripts` (в CI это Node 20 — он .ts не грузит вовсе).
// Поведенческая половина — scripts/scenario-trace-buffer-parity.test.mjs (нужен Node ≥ 22).

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('parity: потолок прибора читается из продуктового модуля, а не дублируется', () => {
  assert.equal(new ScenarioTraceProbe().maxLines, readMaxTraceLines(REPO_ROOT));
});

test('parity: несущие выражения модуля присутствуют дословно', () => {
  const source = readScenarioTraceBufferSource(REPO_ROOT);
  const missing = PROBE_CARRYING_EXPRESSIONS.filter((expression) => !source.includes(expression));

  assert.deepEqual(
    missing,
    [],
    'scenarioTraceBuffer.ts изменил несущие выражения — сверьте копию ScenarioTraceProbe с оригиналом: ' +
      missing.join(' · '),
  );
});

test('parity: новый экспорт продуктового модуля краснит прибор', () => {
  const declared = new Set([...PROBE_MODELLED_EXPORTS, ...Object.keys(PROBE_UNMODELLED_EXPORTS)]);
  const actual = readScenarioTraceBufferExports(REPO_ROOT);
  const unknown = actual.filter((name) => !declared.has(name));

  assert.deepEqual(
    unknown,
    [],
    `scenarioTraceBuffer вырос на ${unknown.join(', ')} — решите, воспроизводит прибор это или нет ` +
      '(PROBE_MODELLED_EXPORTS / PROBE_UNMODELLED_EXPORTS)',
  );

  for (const name of PROBE_MODELLED_EXPORTS) {
    assert.ok(actual.includes(name), `модуль потерял ${name}`);
    assert.equal(typeof new ScenarioTraceProbe()[name], 'function', `прибор не воспроизводит ${name}`);
  }
});
