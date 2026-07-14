import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distillBenchmarkSummary } from './benchmark-push.mjs';

const RAW = {
  generatedAt: '2026-07-06T13:16:57.973Z',
  datasetVersion: 'v2',
  curatedOnly: false,
  sampleCount: 120,
  manifestPath: 'data/detectors-benchmark/v0.2/manifest.json',
  detectors: [
    {
      name: 'yamnet',
      family: 'neural',
      status: 'benchmarked',
      metrics: {
        tp: 55,
        fp: 22,
        fn: 5,
        tn: 38,
        precision: 0.714,
        recall: 0.917,
        f1: 0.803,
        latencyP50Ms: 97.1,
        latencyP95Ms: 132.0,
        extraneous: 42,
      },
      perSample: [{ id: 'drone-dad-0030', truthDrone: true, predDrone: true, maxConfidence: 0.74 }],
    },
    { name: 'clap', family: 'neural', status: 'scaffold' },
  ],
};

test('дистилляция: только агрегаты, perSample и посторонние поля отброшены', () => {
  const s = distillBenchmarkSummary(RAW);
  assert.deepEqual(Object.keys(s), ['generatedAt', 'datasetVersion', 'sampleCount', 'detectors']);
  assert.equal(s.detectors.length, 2);
  const yamnet = s.detectors[0];
  assert.equal(yamnet.perSample, undefined);
  assert.equal(yamnet.metrics.extraneous, undefined);
  assert.equal(yamnet.metrics.f1, 0.803);
  assert.deepEqual(Object.keys(yamnet), ['name', 'family', 'status', 'metrics']);
});

test('scaffold без metrics — поле metrics отсутствует', () => {
  const s = distillBenchmarkSummary(RAW);
  assert.equal(s.detectors[1].metrics, undefined);
});

test('детерминизм: одинаковый вход → одинаковый JSON', () => {
  assert.equal(
    JSON.stringify(distillBenchmarkSummary(RAW)),
    JSON.stringify(distillBenchmarkSummary(RAW)),
  );
});
