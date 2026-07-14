import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMPARE_SCHEMA_VERSION,
  buildCompareReport,
  buildDetectorSummary,
  buildSampleRecord,
  buildTrendsVerdict,
  buildYamnetVerdict,
  falsePositiveRate,
  reportsEqualIgnoringGeneratedAt,
} from './lib/detector-compare-lib.mjs';

/** Фикстура detailed-анализа template-match: дрон уверенно над порогом. */
function trendsDroneAnalysis() {
  return {
    verdict: { isDrone: true, confidence: 0.6234567, frameCount: 9 },
    minConfidence: 0.35,
    trendsResult: {
      detectedState: 'DRONE_TIGHT',
      detectedStateName: 'Дрон (узкий шаблон)',
      confidence: 62.34567,
      scores: [
        { key: 'DRONE_TIGHT', score: 62.34567 },
        { key: 'AMBIENT', score: 31.2 },
        { key: 'SPEECH', score: 12.01 },
        { key: 'RAIN', score: 5 },
      ],
    },
    winnerTemplate: {
      key: 'DRONE_TIGHT',
      name: 'Дрон (узкий шаблон)',
      thresholds: { centroid: { min: 180.4, max: 360.2 } },
    },
    trendsBreakdown: {
      overallScore: 61.5312,
      spectralScore: 71.2489,
      temporalScore: 55.1,
      fields: [
        {
          field: 'centroid',
          category: 'spectral',
          actual: '240 Hz',
          expected: '180 Hz – 360 Hz',
          matchPercent: 96.4,
          weight: 0.35,
        },
        {
          field: 'volumeTrend',
          category: 'temporal',
          actual: 'stable',
          expected: 'stable | constant',
          matchPercent: 100,
          weight: 0.14,
        },
      ],
    },
  };
}

test('buildTrendsVerdict — снапшот дрон-вердикта (details + детерминированное пояснение)', () => {
  assert.deepEqual(buildTrendsVerdict(trendsDroneAnalysis()), {
    isDrone: true,
    score: 0.6235,
    confidence: 0.6235,
    details: {
      templateKey: 'DRONE_TIGHT',
      templateName: 'Дрон (узкий шаблон)',
      detectedState: 'DRONE_TIGHT',
      detectedStateName: 'Дрон (узкий шаблон)',
      threshold: 0.35,
      windows: 9,
      overallScore: 61.5312,
      spectralScore: 71.2489,
      temporalScore: 55.1,
      centroidCorridorHz: { min: 180, max: 360 },
      topScores: [
        { key: 'DRONE_TIGHT', score: 0.6235 },
        { key: 'AMBIENT', score: 0.312 },
        { key: 'SPEECH', score: 0.1201 },
      ],
      fields: [
        {
          field: 'centroid',
          category: 'spectral',
          actual: '240 Hz',
          expected: '180 Hz – 360 Hz',
          matchPercent: 96,
          weight: 0.35,
        },
        {
          field: 'volumeTrend',
          category: 'temporal',
          actual: 'stable',
          expected: 'stable | constant',
          matchPercent: 100,
          weight: 0.14,
        },
      ],
    },
    explanation:
      'Совпал шаблон «Дрон (узкий шаблон)» (DRONE_TIGHT): уверенность 62% ≥ порога 35%; ' +
      'окон анализа: 9; спектральное совпадение 71/100, темпоральное 55/100; ' +
      'коридор центроида ~180–360 Гц → дрон.',
  });
});

test('buildTrendsVerdict — дрон-шаблон ниже порога: пояснение «не дрон»', () => {
  const analysis = trendsDroneAnalysis();
  analysis.verdict = { isDrone: false, confidence: 0.21, frameCount: 9 };
  analysis.trendsResult = { ...analysis.trendsResult, confidence: 21 };
  const verdict = buildTrendsVerdict(analysis);
  assert.equal(verdict.isDrone, false);
  assert.equal(
    verdict.explanation,
    'Дрон-шаблон «Дрон (узкий шаблон)» (DRONE_TIGHT) набрал 21% < порога 35% ' +
      '(окон анализа: 9; коридор центроида ~180–360 Гц) → не дрон.',
  );
});

test('buildTrendsVerdict — победил не-дрон класс: пояснение через класс-победитель', () => {
  const analysis = trendsDroneAnalysis();
  analysis.verdict = { isDrone: false, confidence: 0.44, frameCount: 7 };
  analysis.trendsResult = {
    ...analysis.trendsResult,
    detectedState: 'AMBIENT',
    detectedStateName: 'Фон',
    confidence: 44,
  };
  analysis.winnerTemplate = { key: 'AMBIENT', name: 'Фон', thresholds: { centroid: { min: 50, max: 8000 } } };
  const verdict = buildTrendsVerdict(analysis);
  assert.equal(verdict.isDrone, false);
  assert.equal(
    verdict.explanation,
    'Победил не-дрон класс «Фон» (AMBIENT) с уверенностью 44% при пороге 35% ' +
      '(окон анализа: 7) → не дрон.',
  );
});

test('buildYamnetVerdict — снапшот дрон-вердикта (топ-классы → агрегат ≥ порога)', () => {
  const result = {
    isDrone: true,
    confidence: 0.0834567,
    features: {
      'drone:Helicopter': 0.0612345,
      'drone:Propeller, airscrew': 0.0221,
      'top:Helicopter': 0.0612345,
      'top:Vehicle': 0.031,
      'top:Aircraft': 0.0288,
    },
  };
  assert.deepEqual(buildYamnetVerdict(result, { threshold: 0.01 }), {
    isDrone: true,
    score: 0.0835,
    confidence: 0.0835,
    details: {
      threshold: 0.01,
      droneScore: 0.0835,
      topClasses: [
        { name: 'Helicopter', score: 0.0612 },
        { name: 'Vehicle', score: 0.031 },
        { name: 'Aircraft', score: 0.0288 },
      ],
      droneClassScores: [
        { name: 'Helicopter', score: 0.0612 },
        { name: 'Propeller, airscrew', score: 0.0221 },
      ],
    },
    explanation:
      'Модель увидела: «Helicopter» 0.0612, «Vehicle» 0.031, «Aircraft» 0.0288; ' +
      'агрегат дрон-классов 0.0835 ≥ порога 0.01 → дрон.',
  });
});

test('buildYamnetVerdict — не дрон: агрегат ниже порога', () => {
  const verdict = buildYamnetVerdict(
    { isDrone: false, confidence: 0.004, features: { 'top:Speech': 0.41, 'drone:Helicopter': 0.001 } },
    { threshold: 0.01 },
  );
  assert.equal(verdict.isDrone, false);
  assert.equal(
    verdict.explanation,
    'Модель увидела: «Speech» 0.41; агрегат дрон-классов 0.004 < порога 0.01 → не дрон.',
  );
});

function sampleRecordFixture(id, isDroneTruth, trendsDrone, yamnetDrone, conf = 0.5) {
  return buildSampleRecord(
    {
      id,
      path: `x/${id}.wav`,
      class: isDroneTruth ? 'drone-multirotor' : 'esc50-rain',
      label: isDroneTruth ? 'drone' : 'not-drone',
      durationSec: 5,
      sampleRate: 48000,
      source: 'fixture',
      split: 'test',
      notes: 'фикстура',
    },
    {
      trends: { isDrone: trendsDrone, score: conf, confidence: conf, details: {}, explanation: '' },
      yamnet: { isDrone: yamnetDrone, score: conf, confidence: conf, details: {}, explanation: '' },
    },
  );
}

test('buildSampleRecord — снапшот записи манифеста', () => {
  const record = sampleRecordFixture('drone-001', true, true, false, 0.7);
  assert.deepEqual(record, {
    id: 'drone-001',
    file: 'x/drone-001.wav',
    className: 'drone-multirotor',
    isDroneTruth: true,
    durationSec: 5,
    meta: { sampleRate: 48000, source: 'fixture', split: 'test', notes: 'фикстура' },
    detectors: {
      trends: { isDrone: true, score: 0.7, confidence: 0.7, details: {}, explanation: '' },
      yamnet: { isDrone: false, score: 0.7, confidence: 0.7, details: {}, explanation: '' },
    },
  });
});

test('buildDetectorSummary — P/R/F1/FPR из записей', () => {
  const records = [
    sampleRecordFixture('a', true, true, true), // trends TP
    sampleRecordFixture('b', true, false, true), // trends FN
    sampleRecordFixture('c', false, true, false), // trends FP
    sampleRecordFixture('d', false, false, false), // trends TN
  ];
  assert.deepEqual(buildDetectorSummary(records, 'trends'), {
    tp: 1,
    fp: 1,
    fn: 1,
    tn: 1,
    precision: 0.5,
    recall: 0.5,
    f1: 0.5,
    fpr: 0.5,
  });
  assert.deepEqual(buildDetectorSummary(records, 'yamnet'), {
    tp: 2,
    fp: 0,
    fn: 0,
    tn: 2,
    precision: 1,
    recall: 1,
    f1: 1,
    fpr: 0,
  });
});

test('falsePositiveRate — null при пустом отрицательном классе', () => {
  assert.equal(falsePositiveRate(0, 0), null);
  assert.equal(falsePositiveRate(1, 3), 0.25);
});

test('buildCompareReport — детерминированный порядок сэмплов и схема', () => {
  const samples = [
    sampleRecordFixture('b-second', true, true, true),
    sampleRecordFixture('a-first', false, false, false),
  ];
  const report = buildCompareReport({
    generatedAt: '2026-07-14T00:00:00.000Z',
    corpus: { name: 'free-v1-catalog v2', manifestSha: 'abc', sampleCount: 2, curatedTemplates: 'x.json' },
    thresholds: { trends: 0.35, yamnet: 0.01 },
    samples,
  });
  assert.equal(report.schemaVersion, COMPARE_SCHEMA_VERSION);
  assert.deepEqual(
    report.samples.map((s) => s.id),
    ['a-first', 'b-second'],
  );
  assert.equal(report.summary.trends.tp, 1);
  assert.equal(report.summary.yamnet.tn, 1);
});

test('идемпотентность — отчёты равны с точностью до generatedAt', () => {
  const build = (generatedAt) =>
    buildCompareReport({
      generatedAt,
      corpus: { name: 'v2', manifestSha: 'abc', sampleCount: 1, curatedTemplates: 'x.json' },
      thresholds: { trends: 0.35, yamnet: 0.01 },
      samples: [sampleRecordFixture('a', true, true, true)],
    });
  const first = build('2026-07-14T00:00:00.000Z');
  const second = build('2026-07-15T12:00:00.000Z');
  assert.ok(reportsEqualIgnoringGeneratedAt(first, second));

  const changed = build('2026-07-15T12:00:00.000Z');
  changed.samples[0].detectors.trends.isDrone = false;
  assert.ok(!reportsEqualIgnoringGeneratedAt(first, changed));
  assert.ok(!reportsEqualIgnoringGeneratedAt(null, first));
});
