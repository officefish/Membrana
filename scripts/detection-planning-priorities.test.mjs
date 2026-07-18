import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DETECTION_PLANNING_SNAPSHOT_DATE,
  FFT_METRICS_POTENTIAL_AND_LIMITS_REL,
  buildDetectionPlanningConstraintsBullets,
  buildDetectionPlanningRulesMarkdown,
  buildDetectionPlanningStalenessWarning,
  detectionPlanningSnapshotAgeDays,
  isDetectionPlanningSnapshotStale,
  readFftMetricsPotentialAndLimits,
} from './lib/detection-planning-priorities.mjs';

// ─── протухание снимка магистрали (#530, разбор 16.07) ────────────────────────────

test('снимок свежий в день съёмки — предупреждения нет', () => {
  assert.equal(detectionPlanningSnapshotAgeDays(DETECTION_PLANNING_SNAPSHOT_DATE), 0);
  assert.equal(isDetectionPlanningSnapshotStale(DETECTION_PLANNING_SNAPSHOT_DATE), false);
  assert.equal(buildDetectionPlanningStalenessWarning(DETECTION_PLANNING_SNAPSHOT_DATE), '');
});

test('через неделю снимок ещё свеж, на 8-й день — протух', () => {
  assert.equal(isDetectionPlanningSnapshotStale('2026-07-13'), false);
  assert.equal(isDetectionPlanningSnapshotStale('2026-07-14'), true);
});

test('16.07 предупреждение сработало бы — живой день, когда снимок звал писать готовое ядро', () => {
  assert.equal(detectionPlanningSnapshotAgeDays('2026-07-16'), 10);
  const warning = buildDetectionPlanningStalenessWarning('2026-07-16');
  assert.match(warning, /Снимок магистрали устарел/u);
  assert.match(warning, /10 дн/u);
  assert.match(warning, /fuseDetectorConfidences/u);
});

test('предупреждение попадает в промпт правил (иначе LLM его не увидит)', () => {
  assert.match(buildDetectionPlanningRulesMarkdown('2026-07-16'), /Снимок магистрали устарел/u);
  assert.doesNotMatch(
    buildDetectionPlanningRulesMarkdown(DETECTION_PLANNING_SNAPSHOT_DATE),
    /устарел/u,
  );
});

test('FFT_METRICS doc path is under docs/prompts', () => {
  assert.match(FFT_METRICS_POTENTIAL_AND_LIMITS_REL, /^docs\/prompts\//);
});

test('rules markdown forbids Stage 1.A DSP benchmark magistral', () => {
  const rules = buildDetectionPlanningRulesMarkdown();
  assert.match(rules, /Этап 1\.A/);
  assert.match(rules, /DRONE_TIGHT/);
  assert.match(rules, /no-go/);
});

test('constraints bullets mention FFT_METRICS', () => {
  const bullets = buildDetectionPlanningConstraintsBullets();
  assert.ok(bullets.length >= 3);
  assert.match(bullets.join('\n'), /FFT_METRICS_POTENTIAL_AND_LIMITS/);
});

test('readFftMetricsPotentialAndLimits loads repo doc', () => {
  const text = readFftMetricsPotentialAndLimits();
  assert.ok(text);
  assert.match(text, /TL;DR консилиума/);
});
