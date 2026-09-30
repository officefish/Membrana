/**
 * Строка «ансамбль» в измерителе детекторов (`docs/prompts/DETECTOR_FUSION_SKETCH.md` §5).
 *
 * ЧЕМ СУДИТ. Ровно тем же предикатом, что живой ансамбль Студии: `fuseDetectorConfidences`
 * из `@membrana/core` (dist) — взвешенное среднее сырых confidence присутствующих источников.
 * Своей математики слияния здесь нет и быть не должно: два судьи одного правила — это два
 * правила (урок измерителя mfcc, 31.07). Функция ядра приходит ПАРАМЕТРОМ: dist грузится
 * динамически прогонщиком, чистый модуль от dist не зависит и целиком покрыт зубом.
 *
 * ПОСТ-ФАКТУМ. Слияние идёт над `perSample` одиночных строк, которые прогонщик уже снял:
 * ни один детектор не гоняется заново, продуктовый код (`apps/`, `packages/core`, детекторы)
 * не трогается. Что видит ансамбль — то же, что видит `EnsembleProducer` на приборе: сырой
 * confidence каждого источника по записи (у DSP — калиброванный `analyzeSample`, у yamnet —
 * clip-score модели).
 *
 * ЗАМОК. Судья, пришедший параметром, проверяется на трёх ручных примерах ДО счёта
 * (`assertLiveFusion`): `max`, бинарный OR, медиана, среднее без весов, среднее по молчащим —
 * каждая подмена даёт строку, выглядящую нормально, и ни одна не проходит замок. Не та
 * математика — отказ прогона, а не число в таблице.
 */
import { detectorMetrics, rocAuc } from './benchmark-metrics.mjs';

/**
 * Живой состав — `apps/client/src/plugins/mic-combined-detection/createCombinedStreamDetectors.ts`
 * (#415/#417, консилиум 13.07): harmonic + cepstral + spectral-flux + yamnet, вес 1 у каждого.
 * Совпадение с продуктовым списком держит зуб (читает исходник как текст).
 */
export const LIVE_ENSEMBLE_SOURCES = Object.freeze(['harmonic', 'cepstral', 'spectral-flux', 'yamnet']);

/**
 * Порог вердикта по combinedScore — как у моста device-board
 * (`scenarioMicJournalBridge.ts`: `combinedScore >= 0.5`) и у узла BranchOnDetection (default 0.5).
 * Для ROC-AUC порог не нужен; F1 в строке ансамбля снимается именно на нём.
 */
export const LIVE_ALARM_THRESHOLD = 0.5;

/** Конфигурации одного прогона (сборка §5 прикидки). Веса всюду 1 — как в живом коде. */
export function ensembleConfigs(liveSources = LIVE_ENSEMBLE_SOURCES) {
  return [
    { name: 'live', sources: [...liveSources] },
    { name: 'yamnet solo', sources: ['yamnet'] },
    { name: 'yamnet + template-match', sources: ['yamnet', 'template-match'] },
    ...liveSources.map((dropped) => ({
      name: `live − ${dropped}`,
      sources: liveSources.filter((s) => s !== dropped),
    })),
  ];
}

const EPS = 1e-9;
const near = (a, b) => Math.abs(a - b) < EPS;

/**
 * Три ручных примера, разводящих живое правило с его подменами. Это ФИКСТУРА (входы →
 * посчитанные руками ответы), не вторая реализация слияния.
 *
 * A: [1, 0, 0.04], веса 1 → (1 + 0 + 0.04) / 3. max → 1, OR → 1, медиана → 0.04, min → 0.
 * B: [0.2 × 3, 0.8 × 1] → (0.6 + 0.8) / 4 = 0.35. Среднее без весов → 0.5.
 * C: [0.9 молчит, 0.3] → 0.3, presentCount 1. Среднее по всем → 0.6.
 */
export const LIVE_FUSION_FIXTURE = Object.freeze([
  {
    label: 'A: равные веса — среднее, не max/OR/медиана',
    sources: [
      { name: 'cepstral', family: 'dsp', confidence: 1, isDrone: true },
      { name: 'harmonic', family: 'dsp', confidence: 0, isDrone: false },
      { name: 'yamnet', family: 'neural', confidence: 0.04, isDrone: true },
    ],
    combinedScore: 1.04 / 3,
    presentCount: 3,
  },
  {
    label: 'B: вес участвует в среднем',
    sources: [
      { name: 'a', family: 'dsp', confidence: 0.2, isDrone: false, weight: 3 },
      { name: 'b', family: 'dsp', confidence: 0.8, isDrone: true, weight: 1 },
    ],
    combinedScore: 0.35,
    presentCount: 2,
  },
  {
    label: 'C: молчащий источник не несёт веса',
    sources: [
      { name: 'a', family: 'dsp', confidence: 0.9, isDrone: true, present: false },
      { name: 'b', family: 'dsp', confidence: 0.3, isDrone: false },
    ],
    combinedScore: 0.3,
    presentCount: 1,
  },
]);

/**
 * Замок на судью: функция обязана быть живым правилом ядра. Возвращает null, если прошла,
 * иначе — причину отказа с именем примера и обоими числами.
 *
 * @param {(sources: object[]) => { combinedScore: number; presentCount: number }} fuse
 */
export function liveFusionProblem(fuse) {
  if (typeof fuse !== 'function') return 'судья слияния — не функция';
  for (const { label, sources, combinedScore, presentCount } of LIVE_FUSION_FIXTURE) {
    let result;
    try {
      result = fuse(sources.map((s) => ({ ...s })));
    } catch (error) {
      return `${label}: судья бросил — ${error instanceof Error ? error.message : String(error)}`;
    }
    if (result == null || typeof result.combinedScore !== 'number' || !Number.isFinite(result.combinedScore)) {
      return `${label}: combinedScore не число`;
    }
    if (typeof result.presentCount !== 'number') return `${label}: presentCount не число`;
    if (!near(result.combinedScore, combinedScore)) {
      return `${label}: combinedScore ${result.combinedScore} ≠ ${combinedScore} — это не fuseDetectorConfidences`;
    }
    if (result.presentCount !== presentCount) {
      return `${label}: presentCount ${result.presentCount} ≠ ${presentCount}`;
    }
  }
  return null;
}

export function assertLiveFusion(fuse) {
  const problem = liveFusionProblem(fuse);
  if (problem !== null) {
    throw new Error(`ансамбль: судья слияния не прошёл замок — ${problem}`);
  }
}

/** Имя экспорта ядра, который и есть живое правило. */
export const LIVE_FUSION_EXPORT = 'fuseDetectorConfidences';

/**
 * Паспорт судьи — ОТКУДА взята функция (identity), в дополнение к замку на поведение.
 * Замок выше ловит подмену математики; паспорт фиксирует в отчёте, что функция — именно
 * экспорт `fuseDetectorConfidences` модуля ядра по названному пути, а не одноимённая
 * своя. Модуль без такого экспорта или с чужим именем функции — отказ, не паспорт.
 *
 * @param {Record<string, unknown>} mod загруженный модуль dist ядра
 * @param {string} source путь модуля относительно корня репозитория (в отчёт)
 */
export function fusionPassport(mod, source) {
  const fn = mod?.[LIVE_FUSION_EXPORT];
  if (typeof fn !== 'function') {
    throw new Error(`ансамбль: в ${source} нет экспорта ${LIVE_FUSION_EXPORT} — судьи нет`);
  }
  if (fn.name !== LIVE_FUSION_EXPORT) {
    throw new Error(
      `ансамбль: экспорт ${LIVE_FUSION_EXPORT} из ${source} — функция «${fn.name || '(аноним)'}», а не ядро`,
    );
  }
  assertLiveFusion(fn);
  return { fuse: fn, passport: { source, exportName: LIVE_FUSION_EXPORT, behaviourLock: 'passed' } };
}

/**
 * Слить perSample одиночных строк в perSample ансамбля. Каждая строка — одна запись:
 * источники по имени → `fuse` → combinedScore как балл ранжирования, вердикт по порогу.
 *
 * Отказы — броском, не пропуском: неизмеренный источник, расхождение множеств записей или
 * меток между источниками дали бы строку, посчитанную не по тем записям.
 *
 * @param {{ name: string; sources: readonly string[]; weights?: Record<string, number> }} config
 * @param {{ name: string; family: string; perSample: { id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[] | null }[]} detectors
 * @param {(sources: object[]) => { combinedScore: number; presentCount: number }} fuse
 * @param {number} threshold
 */
export function fuseEnsembleRows(config, detectors, fuse, threshold = LIVE_ALARM_THRESHOLD) {
  assertLiveFusion(fuse);
  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(`ансамбль «${config.name}»: список источников пуст`);
  }
  const byName = new Map(detectors.map((d) => [d.name, d]));
  const indexed = config.sources.map((name) => {
    const detector = byName.get(name);
    if (!detector || !Array.isArray(detector.perSample)) {
      throw new Error(`ансамбль «${config.name}»: источник «${name}» не измерен — строки нет`);
    }
    return { name, family: detector.family, index: new Map(detector.perSample.map((r) => [r.id, r])) };
  });

  const base = indexed[0];
  for (const src of indexed) {
    if (src.index.size !== base.index.size) {
      throw new Error(
        `ансамбль «${config.name}»: у «${src.name}» ${src.index.size} записей, у «${base.name}» ${base.index.size} — корпус не совпадает`,
      );
    }
  }

  const rows = [];
  for (const [id, baseRow] of base.index) {
    const inputs = indexed.map((src) => {
      const row = src.index.get(id);
      if (!row) throw new Error(`ансамбль «${config.name}»: у «${src.name}» нет записи ${id}`);
      if (row.truthDrone !== baseRow.truthDrone) {
        throw new Error(`ансамбль «${config.name}»: метка записи ${id} расходится между источниками`);
      }
      return {
        name: src.name,
        family: src.family,
        confidence: row.maxConfidence,
        isDrone: row.predDrone,
        weight: config.weights?.[src.name] ?? 1,
      };
    });
    const fused = fuse(inputs);
    rows.push({
      id,
      truthDrone: baseRow.truthDrone,
      predDrone: fused.presentCount > 0 && fused.combinedScore >= threshold,
      maxConfidence: fused.combinedScore,
    });
  }
  return rows;
}

/**
 * Отложенная часть: записи манифеста со `split: 'val'` среди измеренных. Калибровка DSP
 * (`calibrate-detectors.mjs`) и шаблон DRONE_TIGHT сняты на `train`; val они не видели.
 * Ничего с меткой val нет → null: «отложенной части нет» печатается, а не подменяется.
 *
 * @param {{ id: string; split?: string }[]} measuredSamples
 */
export function heldOutSelection(measuredSamples) {
  const ids = new Set(measuredSamples.filter((s) => s.split === 'val').map((s) => s.id));
  if (ids.size === 0) return null;
  return {
    label: 'val',
    ids,
    sampleCount: ids.size,
    reason:
      'split: val манифеста — стратифицированно по метке (assign-dataset-splits); калибровка DSP и шаблон DRONE_TIGHT сняты на train',
  };
}

/**
 * Все конфигурации одним проходом: метрики на том же корпусе, что одиночные строки, плюс
 * на отложенной части (если она есть). Задержек у ансамбля нет — слияние пост-фактум.
 */
export function benchmarkEnsembles({
  detectors,
  fuse,
  heldOut = null,
  configs = ensembleConfigs(),
  threshold = LIVE_ALARM_THRESHOLD,
}) {
  assertLiveFusion(fuse);
  return configs.map((config) => {
    const perSample = fuseEnsembleRows(config, detectors, fuse, threshold);
    const heldOutRows = heldOut ? perSample.filter((r) => heldOut.ids.has(r.id)) : [];
    return {
      name: config.name,
      sources: [...config.sources],
      weights: Object.fromEntries(config.sources.map((s) => [s, config.weights?.[s] ?? 1])),
      threshold,
      status: 'fused',
      metrics: detectorMetrics(perSample, []),
      heldOut: heldOut
        ? {
            label: heldOut.label,
            sampleCount: heldOutRows.length,
            metrics: detectorMetrics(heldOutRows, []),
          }
        : null,
      perSample,
    };
  });
}

/**
 * Предикат, названный ДО чисел (тело PR, прикидка §5): «если `live` не бьёт `yamnet solo`
 * по ROC-AUC — состав живого ансамбля надо менять (вторым PR); если бьёт — веса остаются,
 * следующий шаг — разметка своих записей». Считается кодом, а не глазом, на обоих охватах.
 */
export function ensemblePredicate(ensembles) {
  const live = ensembles.find((e) => e.name === 'live');
  const solo = ensembles.find((e) => e.name === 'yamnet solo');
  if (!live || !solo) throw new Error('предикат ансамбля: нет строк live и yamnet solo');
  const compare = (a, b) => {
    if (a == null || b == null) return { live: a, yamnetSolo: b, liveBeatsSolo: null };
    return { live: a, yamnetSolo: b, liveBeatsSolo: a > b };
  };
  return {
    rule: 'live бьёт yamnet solo по ROC-AUC (строго больше)',
    all: compare(live.metrics.rocAuc, solo.metrics.rocAuc),
    heldOut:
      live.heldOut && solo.heldOut
        ? compare(live.heldOut.metrics.rocAuc, solo.heldOut.metrics.rocAuc)
        : null,
  };
}

/** ROC-AUC подмножества perSample по набору id — для перепроверки строк снаружи. */
export function rocAucOf(perSample, ids = null) {
  return rocAuc(ids ? perSample.filter((r) => ids.has(r.id)) : perSample);
}
