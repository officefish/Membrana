#!/usr/bin/env node
/**
 * Генерация TS-копии калиброванного пресета из JSON (ADR-0006 Р2).
 *
 * Направление строго `JSON → TS`:
 *   корпус → scripts/calibrate-detectors.mjs → calibration-preset.json → ЭТОТ СКРИПТ → .ts → плагины
 *
 * До ADR-0006 последняя стрелка была РУЧНОЙ транскрипцией: калибратор писал
 * JSON, а числа в рантайм переносил человек. Обратное направление (TS как
 * владелец) отвергнуто сознательно — оно узаконило бы транскрипцию и лишило
 * рекалибровку пути в код: JSON есть выход измерения, а не сериализация кода.
 *
 * Usage:
 *   node scripts/generate-calibration-preset-ts.mjs          # записать
 *   node scripts/generate-calibration-preset-ts.mjs --check  # только проверить (exit 1 при расхождении)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CALIBRATION_PRESET_JSON, sampleOptionsFromPreset } from './lib/calibration-preset.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PRESET_TS = join(
  ROOT,
  'packages',
  'services',
  'drone-detection-orchestrator',
  'src',
  'calibration-preset.ts',
);

/**
 * Чистое ядро: опции пресета → текст TS-модуля. Экспорт ради теста —
 * проверка равенства обязана сравнивать РОВНО то, что пишет генератор.
 *
 * @param {Record<string, { aggregation?: string; sampleConfidenceThreshold?: number }>} options
 * @returns {string}
 */
export function renderCalibrationPresetTs(options) {
  const entries = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, cfg]) => {
      const key = /^[a-zA-Z_$][\w$]*$/.test(name) ? name : `'${name}'`;
      const fields = Object.entries(cfg)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
        .join(', ');
      return `  ${key}: { ${fields} },`;
    });

  return `import type { AnalyzeSampleOptions } from '@membrana/detector-base';

/**
 * Train-tuned sample aggregation presets (VDR4).
 *
 * СГЕНЕРИРОВАНО — не редактировать руками.
 * Источник: \`data/detectors-benchmark/v0.2/calibration-preset.json\`
 * Генератор: \`node scripts/generate-calibration-preset-ts.mjs\`
 *
 * Владелец истины — JSON (выход \`scripts/calibrate-detectors.mjs\`); эта
 * константа производна от него (ADR-0006 Р2). Правка здесь будет затёрта
 * и уронит \`scripts/calibration-preset-sync.test.mjs\`.
 */
export const CALIBRATED_SAMPLE_OPTIONS: Record<string, AnalyzeSampleOptions> = {
${entries.join('\n')}
};
`;
}

const isMain = process.argv[1]?.endsWith('generate-calibration-preset-ts.mjs');
if (isMain) {
  const check = process.argv.includes('--check');
  const preset = JSON.parse(await readFile(CALIBRATION_PRESET_JSON, 'utf8'));
  const expected = renderCalibrationPresetTs(sampleOptionsFromPreset(preset));

  if (check) {
    const actual = await readFile(PRESET_TS, 'utf8');
    if (actual !== expected) {
      console.error(
        'Калиброванный пресет разошёлся: TS-копия не равна генерации из JSON.\n' +
          'Лечение: node scripts/generate-calibration-preset-ts.mjs\n' +
          'НЕ править .ts руками — владелец истины JSON (ADR-0006 Р2).',
      );
      process.exit(1);
    }
    console.log('calibration-preset: TS-копия совпадает с JSON.');
  } else {
    await writeFile(PRESET_TS, expected, 'utf8');
    console.log(`Wrote ${PRESET_TS}`);
  }
}
