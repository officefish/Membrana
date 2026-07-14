/**
 * Чистые функции сборки артефакта detector-compare (#452, panel-detector-compare-board).
 *
 * Контракт с панелью — JSON `docs/reports/detector-compare/latest.json`
 * (консилиум detector-compare-board-2026-07-14): per-sample вердикты trends
 * (DRONE_TIGHT, движок template-match) и yamnet с details и ДЕТЕРМИНИРОВАННЫМИ
 * пояснениями (шаблонные строки, БЕЗ LLM). Все функции чистые — снапшот-тесты
 * на фикстурных вердиктах в `detector-compare-export.test.mjs`.
 */

import { confusionFromPairs, f1Score, precision, recall } from './benchmark-metrics.mjs';

export const COMPARE_SCHEMA_VERSION = 1;

/** Один шаг округления для всех float артефакта — стабильный byte-в-byte JSON. */
export function round4(value) {
  return Math.round(value * 10_000) / 10_000;
}

/** FPR = FP / (FP + TN); null при пустом отрицательном классе. */
export function falsePositiveRate(fp, tn) {
  const d = fp + tn;
  return d === 0 ? null : fp / d;
}

function pct(value01) {
  return `${Math.round(value01 * 100)}%`;
}

/** Ключи trends-шаблонов дрона (зеркало DRONE_TEMPLATE_KEY_PREFIX template-match). */
const DRONE_TEMPLATE_KEY_PREFIX = 'DRONE';

/**
 * Вердикт trends (DRONE_TIGHT) из detailed-анализа template-match.
 * @param {{ verdict: { isDrone: boolean; confidence: number; frameCount: number },
 *   minConfidence: number,
 *   trendsResult: { detectedState: string; detectedStateName: string; confidence: number;
 *     scores: readonly { key: string; score: number }[] },
 *   winnerTemplate: { key: string; name: string; thresholds?: { centroid?: { min: number; max: number } } },
 *   trendsBreakdown: { overallScore: number; spectralScore: number; temporalScore: number;
 *     fields: readonly { field: string; category: string; actual: string; expected: string;
 *       matchPercent: number; weight: number }[] } }} analysis
 */
export function buildTrendsVerdict(analysis) {
  const { verdict, minConfidence, trendsResult, winnerTemplate, trendsBreakdown } = analysis;
  const confidence = round4(verdict.confidence);
  const centroid = winnerTemplate.thresholds?.centroid ?? null;
  const details = {
    templateKey: winnerTemplate.key,
    templateName: winnerTemplate.name,
    detectedState: trendsResult.detectedState,
    detectedStateName: trendsResult.detectedStateName,
    /** Порог уверенности (0..1), при котором дрон-шаблон засчитывается. */
    threshold: round4(minConfidence),
    /** Окон метрик FFT-трендов в анализе клипа. */
    windows: verdict.frameCount,
    /** Скоры совпадения с шаблоном-победителем, 0..100. */
    overallScore: round4(trendsBreakdown.overallScore),
    spectralScore: round4(trendsBreakdown.spectralScore),
    temporalScore: round4(trendsBreakdown.temporalScore),
    centroidCorridorHz: centroid
      ? { min: Math.round(centroid.min), max: Math.round(centroid.max) }
      : null,
    topScores: trendsResult.scores
      .slice(0, 3)
      .map((s) => ({ key: s.key, score: round4(s.score / 100) })),
    fields: trendsBreakdown.fields.map((f) => ({
      field: f.field,
      category: f.category,
      actual: f.actual,
      expected: f.expected,
      matchPercent: Math.round(f.matchPercent),
      weight: f.weight,
    })),
  };
  return {
    isDrone: verdict.isDrone,
    score: confidence,
    confidence,
    details,
    explanation: buildTrendsExplanation(verdict.isDrone, confidence, details),
  };
}

/** Детерминированное пояснение trends: шаблон/окна/пики (без LLM). */
export function buildTrendsExplanation(isDrone, confidence, details) {
  const conf = pct(confidence);
  const thr = pct(details.threshold);
  const corridor = details.centroidCorridorHz
    ? `; коридор центроида ~${details.centroidCorridorHz.min}–${details.centroidCorridorHz.max} Гц`
    : '';
  const winnerIsDrone = details.detectedState.startsWith(DRONE_TEMPLATE_KEY_PREFIX);
  if (isDrone) {
    return (
      `Совпал шаблон «${details.templateName}» (${details.templateKey}): ` +
      `уверенность ${conf} ≥ порога ${thr}; окон анализа: ${details.windows}; ` +
      `спектральное совпадение ${Math.round(details.spectralScore)}/100, ` +
      `темпоральное ${Math.round(details.temporalScore)}/100${corridor} → дрон.`
    );
  }
  if (winnerIsDrone) {
    return (
      `Дрон-шаблон «${details.templateName}» (${details.templateKey}) набрал ${conf} ` +
      `< порога ${thr} (окон анализа: ${details.windows}${corridor}) → не дрон.`
    );
  }
  return (
    `Победил не-дрон класс «${details.detectedStateName}» (${details.detectedState}) ` +
    `с уверенностью ${conf} при пороге ${thr} (окон анализа: ${details.windows}) → не дрон.`
  );
}

/**
 * Вердикт yamnet из DetectionResult детектора (features: `drone:*` — сырые score
 * дрон-классов AudioSet, `top:*` — топ-5 классов клипа по clip-mean score).
 * @param {{ isDrone: boolean; confidence: number; features?: Record<string, number> }} result
 * @param {{ threshold: number }} options
 */
export function buildYamnetVerdict(result, { threshold }) {
  const droneScore = round4(result.confidence);
  const topClasses = [];
  const droneClassScores = [];
  for (const [key, value] of Object.entries(result.features ?? {})) {
    if (key.startsWith('top:')) {
      topClasses.push({ name: key.slice('top:'.length), score: round4(value) });
    } else if (key.startsWith('drone:')) {
      droneClassScores.push({ name: key.slice('drone:'.length), score: round4(value) });
    }
  }
  // Детерминированный порядок: score убыв., затем имя (без localeCompare — локаленезависимо).
  droneClassScores.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1));
  const details = {
    /** Порог drone-score для вердикта isDrone. */
    threshold: round4(threshold),
    droneScore,
    topClasses,
    droneClassScores: droneClassScores.slice(0, 5),
  };
  return {
    isDrone: result.isDrone,
    score: droneScore,
    confidence: droneScore,
    details,
    explanation: buildYamnetExplanation(result.isDrone, details),
  };
}

/** Детерминированное пояснение yamnet: топ-классы → агрегат vs порог (без LLM). */
export function buildYamnetExplanation(isDrone, details) {
  const top = details.topClasses
    .slice(0, 5)
    .map((c) => `«${c.name}» ${c.score}`)
    .join(', ');
  const rel = isDrone ? '≥' : '<';
  const word = isDrone ? 'дрон' : 'не дрон';
  return (
    `Модель увидела: ${top || 'ни одного значимого класса'}; ` +
    `агрегат дрон-классов ${details.droneScore} ${rel} порога ${details.threshold} → ${word}.`
  );
}

/**
 * Запись сэмпла артефакта из строки бенчмарк-манифеста + вердиктов детекторов.
 * @param {{ id: string; path: string; class?: string; label?: string; durationSec?: number;
 *   sampleRate?: number; source?: string; split?: string; notes?: string }} entry
 * @param {{ trends: object; yamnet: object }} detectors
 */
export function buildSampleRecord(entry, detectors) {
  return {
    id: entry.id,
    file: entry.path,
    className: entry.class ?? null,
    isDroneTruth: entry.label === 'drone',
    durationSec: entry.durationSec ?? null,
    meta: {
      sampleRate: entry.sampleRate ?? null,
      source: entry.source ?? null,
      split: entry.split ?? null,
      notes: entry.notes ?? null,
    },
    detectors,
  };
}

/** Сводка P/R/F1/FPR одного детектора по собранным записям сэмплов. */
export function buildDetectorSummary(sampleRecords, detectorKey) {
  const pairs = sampleRecords.map((s) => ({
    truthDrone: s.isDroneTruth,
    predDrone: s.detectors[detectorKey].isDrone,
  }));
  const { tp, fp, fn, tn } = confusionFromPairs(pairs);
  const p = precision(tp, fp);
  const r = recall(tp, fn);
  const f1 = f1Score(p, r);
  const fpr = falsePositiveRate(fp, tn);
  return {
    tp,
    fp,
    fn,
    tn,
    precision: p == null ? null : round4(p),
    recall: r == null ? null : round4(r),
    f1: f1 == null ? null : round4(f1),
    fpr: fpr == null ? null : round4(fpr),
  };
}

/**
 * Полный артефакт сравнения. Сэмплы сортируются по id — порядок в JSON
 * детерминирован независимо от порядка прогона.
 */
export function buildCompareReport({ generatedAt, corpus, thresholds, samples }) {
  const sorted = [...samples].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    schemaVersion: COMPARE_SCHEMA_VERSION,
    generatedAt,
    corpus,
    thresholds,
    summary: {
      trends: buildDetectorSummary(sorted, 'trends'),
      yamnet: buildDetectorSummary(sorted, 'yamnet'),
    },
    samples: sorted,
  };
}

/**
 * Идемпотентность экспортёра: отчёты «равны», если совпадает всё, кроме
 * generatedAt — тогда файл не перезаписывается и git diff пуст.
 */
export function reportsEqualIgnoringGeneratedAt(a, b) {
  if (!a || !b) return false;
  const strip = (r) => JSON.stringify({ ...r, generatedAt: null });
  return strip(a) === strip(b);
}
