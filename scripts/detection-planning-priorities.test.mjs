import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FFT_METRICS_POTENTIAL_AND_LIMITS_REL,
  buildDetectionPlanningConstraintsBullets,
  buildDetectionPlanningRulesMarkdown,
  readFftMetricsPotentialAndLimits,
} from './lib/detection-planning-priorities.mjs';

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
