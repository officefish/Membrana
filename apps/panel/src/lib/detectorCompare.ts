/**
 * Борд detector-compare (#452) — ЛОКАЛЬНЫЕ типы и чистые функции панели.
 *
 * Панель НЕ импортирует детекторные пакеты (консилиум
 * detector-compare-board-2026-07-14): контракт — JSON-артефакт экспортёра
 * `yarn detector:compare:export`, раздаваемый статикой
 * `/compare-data/latest.json`. Данные публичны (те же числа — в открытом
 * репо); operator-гейт раздела — UX-настройка рабочего места, НЕ security.
 */

export type DetectorKey = 'trends' | 'yamnet';

export interface CompareVerdict {
  readonly isDrone: boolean;
  readonly score: number;
  readonly confidence: number;
  readonly details: Record<string, unknown>;
  readonly explanation: string;
}

export interface CompareSampleMeta {
  readonly sampleRate: number | null;
  readonly source: string | null;
  readonly split: string | null;
  readonly notes: string | null;
}

export interface CompareSample {
  readonly id: string;
  readonly file: string;
  readonly className: string | null;
  readonly isDroneTruth: boolean;
  readonly durationSec: number | null;
  readonly meta: CompareSampleMeta;
  readonly detectors: Readonly<Record<DetectorKey, CompareVerdict>>;
}

export interface DetectorSummary {
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
  readonly tn: number;
  readonly precision: number | null;
  readonly recall: number | null;
  readonly f1: number | null;
  readonly fpr: number | null;
}

export interface CompareReport {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly corpus: { readonly name: string; readonly manifestSha: string; readonly sampleCount: number };
  readonly thresholds: Readonly<Record<DetectorKey, number>>;
  readonly summary: Readonly<Record<DetectorKey, DetectorSummary>>;
  readonly samples: readonly CompareSample[];
}

export const COMPARE_SCHEMA_VERSION = 1;

export const DETECTOR_LABELS: Record<DetectorKey, string> = {
  trends: 'trends (DRONE_TIGHT)',
  yamnet: 'yamnet',
};

function isVerdict(value: unknown): value is CompareVerdict {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.isDrone === 'boolean' &&
    typeof v.confidence === 'number' &&
    Number.isFinite(v.confidence) &&
    typeof v.explanation === 'string' &&
    typeof v.details === 'object' &&
    v.details !== null
  );
}

function isSample(value: unknown): value is CompareSample {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  const detectors = s.detectors as Record<string, unknown> | undefined;
  return (
    typeof s.id === 'string' &&
    typeof s.file === 'string' &&
    typeof s.isDroneTruth === 'boolean' &&
    typeof detectors === 'object' &&
    detectors !== null &&
    isVerdict(detectors.trends) &&
    isVerdict(detectors.yamnet)
  );
}

/**
 * Валидация артефакта. Бросает Error с человекочитаемой причиной —
 * раздел показывает её в состоянии «ошибка», не падая белым экраном.
 */
export function parseCompareReport(data: unknown): CompareReport {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Артефакт сравнения не является объектом');
  }
  const r = data as Record<string, unknown>;
  if (r.schemaVersion !== COMPARE_SCHEMA_VERSION) {
    throw new Error(
      `Неподдерживаемая версия схемы артефакта: ${String(r.schemaVersion)} (ожидалась ${COMPARE_SCHEMA_VERSION})`,
    );
  }
  if (!Array.isArray(r.samples)) {
    throw new Error('В артефакте нет списка сэмплов');
  }
  const bad = r.samples.findIndex((s) => !isSample(s));
  if (bad !== -1) {
    throw new Error(`Сэмпл #${bad} не соответствует схеме вердиктов trends/yamnet`);
  }
  if (typeof r.summary !== 'object' || r.summary === null) {
    throw new Error('В артефакте нет сводки метрик');
  }
  return data as CompareReport;
}

/** Фильтры таблицы: по разметке корпуса + главный аналитический кейс — расхождения. */
export type CompareFilter = 'all' | 'drone' | 'not-drone' | 'disagree';

export const FILTER_LABELS: Record<CompareFilter, string> = {
  all: 'все',
  drone: 'дрон',
  'not-drone': 'не дрон',
  disagree: 'расхождения',
};

export function applyFilter(
  samples: readonly CompareSample[],
  filter: CompareFilter,
): CompareSample[] {
  switch (filter) {
    case 'drone':
      return samples.filter((s) => s.isDroneTruth);
    case 'not-drone':
      return samples.filter((s) => !s.isDroneTruth);
    case 'disagree':
      return samples.filter((s) => s.detectors.trends.isDrone !== s.detectors.yamnet.isDrone);
    default:
      return [...samples];
  }
}

export type SortDirection = 'desc' | 'asc';

/** Сортировка по уверенности выбранного детектора; tiebreak по id — стабильно. */
export function sortByConfidence(
  samples: readonly CompareSample[],
  detector: DetectorKey,
  direction: SortDirection,
): CompareSample[] {
  const sign = direction === 'desc' ? -1 : 1;
  return [...samples].sort((a, b) => {
    const diff = a.detectors[detector].confidence - b.detectors[detector].confidence;
    if (diff !== 0) return sign * diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** «67.5%» из доли 0..1; «—» для null (пустой класс). */
export function formatPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

/** Скор вердикта — 3 знака, стабильная ширина под tabular-nums. */
export function formatScore(value: number): string {
  return value.toFixed(3);
}

/** Вердикт всегда словом (не только цветом/иконкой — DESIGN.md, a11y). */
export function verdictWord(isDrone: boolean): string {
  return isDrone ? 'дрон' : 'не дрон';
}

export function formatDuration(durationSec: number | null): string {
  return durationSec == null ? '—' : `${durationSec.toFixed(0)} с`;
}
