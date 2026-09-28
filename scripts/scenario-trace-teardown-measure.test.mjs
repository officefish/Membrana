import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  PROBE_MODELLED_EXPORTS,
  PROBE_UNMODELLED_EXPORTS,
  ScenarioTraceProbe,
  fillSyntheticTrace,
  makeCountingSink,
  readMaxTraceLines,
  runScenarioTraceTeardownBenchmark,
  scenarioTraceBufferSourcePath,
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


// --- Зуб на предмет прибора (#2485) ---------------------------------------------------------
// Прибор воспроизводит логику scenarioTraceBuffer КОПИЕЙ. Копия молча разойдётся с оригиналом,
// и прибор начнёт мерить прошлое. Поэтому ниже подлинный модуль ИМПОРТИРУЕТСЯ и сверяется с
// копией: формовка строки, потолок кольца, вытеснение, склейка текста, поверхность экспортов.
// Импорт .ts работает на стирании типов (Node ≥ 22.18); модуль не имеет своих импортов.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const real = await import(pathToFileURL(scenarioTraceBufferSourcePath(REPO_ROOT)).href);

test('parity: потолок прибора читается из продуктового модуля и совпадает с его поведением', () => {
  const declared = readMaxTraceLines(REPO_ROOT);

  real.clearScenarioTraceBuffer();
  for (let i = 0; i < declared + 25; i += 1) {
    real.appendScenarioTraceLine('tick', { tick: i });
  }
  const observed = real.getScenarioTraceLineCount();
  real.clearScenarioTraceBuffer();

  assert.equal(observed, declared, 'MAX_TRACE_LINES из текста не совпал с наблюдаемым потолком');
  assert.equal(new ScenarioTraceProbe().maxLines, declared, 'умолчание прибора отстало от модуля');
});

test('parity: копия формует строку байт в байт как продуктовый модуль', () => {
  const probe = new ScenarioTraceProbe();
  const cases = [
    ['no ctx', undefined],
    ['empty ctx', {}],
    ['string', { runId: 'abc' }],
    ['null', { nodeId: null }],
    ['mixed', { runId: 'r', tick: 7, branch: 'main', ok: true, ratio: 0.5 }],
  ];

  for (const [message, context] of cases) {
    assert.equal(
      probe.formatScenarioTraceLine(message, context),
      real.formatScenarioTraceLine(message, context),
      `формовка разошлась на «${message}»`,
    );
  }
});

test('parity: вытеснение и склейка текста совпадают на переполненном кольце', () => {
  const cap = readMaxTraceLines(REPO_ROOT);
  const probe = new ScenarioTraceProbe({ maxLines: cap });

  real.clearScenarioTraceBuffer();
  for (let i = 0; i < cap + 137; i += 1) {
    real.appendScenarioTraceLine('[device-board] main-tick-done', { tick: i, nodeId: `node-${i % 37}` });
    probe.appendScenarioTraceLine('[device-board] main-tick-done', { tick: i, nodeId: `node-${i % 37}` });
  }

  const realText = real.getScenarioTraceText();
  const probeText = probe.getScenarioTraceText();
  real.clearScenarioTraceBuffer();

  assert.equal(probe.getScenarioTraceLines().length, cap);
  assert.equal(probeText, realText, 'текст копии разошёлся с текстом модуля');
  assert.equal(Buffer.byteLength(probeText, 'utf8'), Buffer.byteLength(realText, 'utf8'));
});

test('parity: снапшот держит ссылку между мутациями у копии и у модуля одинаково', () => {
  const probe = new ScenarioTraceProbe();
  real.clearScenarioTraceBuffer();

  real.appendScenarioTraceLine('a');
  probe.appendScenarioTraceLine('a');
  const realFirst = real.getScenarioTraceLines();
  const probeFirst = probe.getScenarioTraceLines();

  assert.equal(real.getScenarioTraceLines(), realFirst, 'модуль пересобрал снапшот без мутации');
  assert.equal(probe.getScenarioTraceLines(), probeFirst, 'копия пересобрала снапшот без мутации');

  real.appendScenarioTraceLine('b');
  probe.appendScenarioTraceLine('b');

  assert.notEqual(real.getScenarioTraceLines(), realFirst);
  assert.notEqual(probe.getScenarioTraceLines(), probeFirst);
  real.clearScenarioTraceBuffer();
});

test('parity: новый экспорт продуктового модуля краснит прибор', () => {
  const declared = new Set([...PROBE_MODELLED_EXPORTS, ...Object.keys(PROBE_UNMODELLED_EXPORTS)]);
  const unknown = Object.keys(real).filter((name) => !declared.has(name));

  assert.deepEqual(
    unknown,
    [],
    `scenarioTraceBuffer вырос на ${unknown.join(', ')} — решите, воспроизводит прибор это или нет ` +
      '(PROBE_MODELLED_EXPORTS / PROBE_UNMODELLED_EXPORTS)',
  );

  for (const name of PROBE_MODELLED_EXPORTS) {
    assert.equal(typeof real[name], 'function', `модуль потерял ${name}`);
    assert.equal(
      typeof new ScenarioTraceProbe()[name],
      'function',
      `прибор не воспроизводит ${name}`,
    );
  }
});
