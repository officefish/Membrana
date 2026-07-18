/**
 * Калиброванный пресет детекторов — единый путь получения (ADR-0006 Р2).
 *
 * Владелец истины — JSON `data/detectors-benchmark/v0.2/calibration-preset.json`:
 * он есть ВЫХОД калибратора (`scripts/calibrate-detectors.mjs` пишет его по
 * grid-search на корпусе). TS-константа `CALIBRATED_SAMPLE_OPTIONS` в
 * `drone-detection-orchestrator` — производная, генерируется из этого JSON
 * (`scripts/generate-calibration-preset-ts.mjs`), а не наоборот: обратное
 * направление узаконило бы ручную транскрипцию и лишило рекалибровку пути в код.
 *
 * Зачем в бенчмарке: до ADR-0006 прогон гонял детекторы ДЕФОЛТАМИ пакетов, а
 * боевая поверхность (плагины модуля микрофон) — пресетом. Прогон мерил
 * конфигурацию, которой нет ни на одной поверхности.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Владелец истины. Путь захардкожен намеренно: пресет — конфиг детектора, не корпус. */
export const CALIBRATION_PRESET_JSON = join(
  ROOT,
  'data',
  'detectors-benchmark',
  'v0.2',
  'calibration-preset.json',
);

/** Поля, которые пресет несёт в `analyzeSample`. Остальное в JSON — метаданные калибровки. */
const SAMPLE_OPTION_KEYS = ['aggregation', 'sampleConfidenceThreshold'];

/**
 * Чистое ядро: JSON пресета → опции `analyzeSample` по имени детектора.
 * Экспорт ради тестов и генератора TS-копии — обе стороны обязаны получать
 * ОДИН И ТОТ ЖЕ результат из одного источника.
 *
 * @param {unknown} presetJson
 * @returns {Record<string, { aggregation?: string; sampleConfidenceThreshold?: number }>}
 */
export function sampleOptionsFromPreset(presetJson) {
  const detectors = presetJson?.detectors;
  if (detectors == null || typeof detectors !== 'object') return {};
  /** @type {Record<string, object>} */
  const out = {};
  for (const [name, cfg] of Object.entries(detectors)) {
    if (cfg == null || typeof cfg !== 'object') continue;
    /** @type {Record<string, unknown>} */
    const picked = {};
    for (const key of SAMPLE_OPTION_KEYS) {
      if (cfg[key] !== undefined) picked[key] = cfg[key];
    }
    if (Object.keys(picked).length > 0) out[name] = picked;
  }
  return out;
}

/**
 * Читает пресет с диска. Бросает — молчаливый откат на дефолты и есть тот
 * дефект, ради которого писан ADR-0006: прогон обязан либо исполнить боевую
 * конфигурацию, либо сказать об этом вслух.
 *
 * @returns {Promise<{ options: Record<string, object>; generatedAt: string | null; bestOverall: string | null }>}
 */
export async function loadCalibrationPreset(presetPath = CALIBRATION_PRESET_JSON) {
  let raw;
  try {
    raw = await readFile(presetPath, 'utf8');
  } catch (e) {
    throw new Error(
      `Калиброванный пресет не прочитан (${presetPath}): ${e.message}\n` +
        'Прогон обязан исполнять боевую конфигурацию (ADR-0006 Р1). ' +
        'Отладочный прогон на дефолтах: --config defaults',
    );
  }
  const json = JSON.parse(raw);
  return {
    options: sampleOptionsFromPreset(json),
    generatedAt: json?.generatedAt ?? null,
    bestOverall: json?.bestOverall ?? null,
  };
}
