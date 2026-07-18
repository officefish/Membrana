/**
 * ADR-0006 Р3: расхождение калиброванного пресета обязано краснеть, а не дрейфовать.
 *
 * До ADR-0006 TS-копия переносилась в код руками, и защиты от расхождения не
 * было вовсе — ни теста, ни генерации. Совпадение держалось на внимательности.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PRESET_TS,
  renderCalibrationPresetTs,
} from './generate-calibration-preset-ts.mjs';
import {
  CALIBRATION_PRESET_JSON,
  sampleOptionsFromPreset,
} from './lib/calibration-preset.mjs';

test('TS-копия пресета совпадает с генерацией из JSON', async () => {
  const preset = JSON.parse(await readFile(CALIBRATION_PRESET_JSON, 'utf8'));
  const expected = renderCalibrationPresetTs(sampleOptionsFromPreset(preset));
  const actual = await readFile(PRESET_TS, 'utf8');
  assert.equal(
    actual,
    expected,
    'TS-копия разошлась с JSON. Лечение: node scripts/generate-calibration-preset-ts.mjs',
  );
});

test('мутационная проверка: сдвиг порога в JSON ломает равенство', async () => {
  const preset = JSON.parse(await readFile(CALIBRATION_PRESET_JSON, 'utf8'));
  const actual = await readFile(PRESET_TS, 'utf8');

  const mutated = structuredClone(preset);
  const first = Object.keys(mutated.detectors)[0];
  mutated.detectors[first].sampleConfidenceThreshold = 0.42;

  const rendered = renderCalibrationPresetTs(sampleOptionsFromPreset(mutated));
  assert.notEqual(rendered, actual, 'тест обязан краснеть на осмысленном сдвиге порога');
  assert.match(rendered, /0\.42/, 'сдвинутое значение должно доехать до генерации');
});

test('мутационная проверка: смена режима агрегации ломает равенство', async () => {
  const preset = JSON.parse(await readFile(CALIBRATION_PRESET_JSON, 'utf8'));
  const actual = await readFile(PRESET_TS, 'utf8');

  const mutated = structuredClone(preset);
  const first = Object.keys(mutated.detectors)[0];
  mutated.detectors[first].aggregation = 'majority-of-two';

  const rendered = renderCalibrationPresetTs(sampleOptionsFromPreset(mutated));
  assert.notEqual(rendered, actual, 'смена режима агрегации обязана краснеть');
});

test('из пресета берутся только поля analyzeSample, метаданные не протекают', () => {
  const options = sampleOptionsFromPreset({
    generatedAt: '2026-06-15T12:30:00.126Z',
    groundTruth: { labeledCount: 120 },
    bestOverall: 'cepstral',
    detectors: {
      harmonic: { aggregation: 'any-frame', sampleConfidenceThreshold: 0, bestF1: 0.53 },
    },
  });
  assert.deepEqual(options, {
    harmonic: { aggregation: 'any-frame', sampleConfidenceThreshold: 0 },
  });
});

test('пустой/битый пресет не роняет ядро, а даёт пустые опции', () => {
  assert.deepEqual(sampleOptionsFromPreset(null), {});
  assert.deepEqual(sampleOptionsFromPreset({}), {});
  assert.deepEqual(sampleOptionsFromPreset({ detectors: null }), {});
  assert.deepEqual(sampleOptionsFromPreset({ detectors: { x: null } }), {});
});
