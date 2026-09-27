import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ScenarioTraceProbe,
  fillSyntheticTrace,
  makeCountingSink,
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

