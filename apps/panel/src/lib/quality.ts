/**
 * Чистая математика/форматтеры бордов контроля качества (#454, консилиум
 * quality-control-contour): типы данных office, FPR, проценты, возраст записи,
 * сравнение prod↔main. Всё тестируемо без сети и DOM.
 */

// ── drift-anchor (GET /v1/drift-anchor/digest, public) ──

export interface DriftAnchorRecord {
  anchorKind: 'data' | 'code';
  anchorSource: 'ci' | 'schedule';
  detectorVersion: string;
  imageFrozenAt: string | null;
  delta: number;
  verdict: 'ok' | 'drift' | 'broken';
  takenAt: string;
  metrics: Record<string, number>;
}

export const ANCHOR_LABELS: Record<string, string> = {
  'code:ci': 'Код (CI, main)',
  'code:schedule': 'Код (office, prod)',
  'data:schedule': 'Данные (office, prod)',
};

export const VERDICT_LABELS: Record<DriftAnchorRecord['verdict'], string> = {
  ok: 'в норме',
  drift: 'дрейф',
  broken: 'сломан',
};

export function anchorLabel(rec: Pick<DriftAnchorRecord, 'anchorKind' | 'anchorSource'>): string {
  const key = `${rec.anchorKind}:${rec.anchorSource}`;
  return ANCHOR_LABELS[key] ?? key;
}

/** Возраст записи словом: «только что» / «N мин назад» / «N ч назад» / «N дн назад». */
export function ageLabel(takenAt: string, now: Date): string {
  const then = Date.parse(takenAt);
  if (!Number.isFinite(then)) return takenAt;
  const mins = Math.floor((now.getTime() - then) / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}

export type ProdMainComparison =
  | { state: 'match'; detectorVersion: string }
  | { state: 'diverged'; ci: string; schedule: string }
  | { state: 'insufficient' };

/**
 * Сравнение prod↔main по detectorVersion двух code-якорей (суть divergence-алерта
 * DA4 — строковое сравнение версий, ядро в панель не тянем).
 */
export function compareProdMain(records: DriftAnchorRecord[]): ProdMainComparison {
  const ci = records.find((r) => r.anchorKind === 'code' && r.anchorSource === 'ci');
  const schedule = records.find((r) => r.anchorKind === 'code' && r.anchorSource === 'schedule');
  if (!ci || !schedule) return { state: 'insufficient' };
  return ci.detectorVersion === schedule.detectorVersion
    ? { state: 'match', detectorVersion: ci.detectorVersion }
    : { state: 'diverged', ci: ci.detectorVersion, schedule: schedule.detectorVersion };
}

// ── benchmark (GET /v1/benchmark/summary, operator+) ──

export interface DetectorMetrics {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
  latencyP50Ms?: number;
  latencyP95Ms?: number;
}

export interface BenchmarkDetector {
  name: string;
  family: string;
  status: string;
  metrics?: DetectorMetrics;
}

export interface BenchmarkSummary {
  report: {
    generatedAt: string;
    datasetVersion: string;
    sampleCount: number;
    detectors: BenchmarkDetector[];
  };
  ingestedAt: string;
}

/** FPR = FP / (FP + TN); нет негативов → null (не 0 — честность важнее красоты). */
export function fpr(m: Pick<DetectorMetrics, 'fp' | 'tn'>): number | null {
  const negatives = m.fp + m.tn;
  return negatives > 0 ? m.fp / negatives : null;
}

/** Доля → проценты с одним знаком: 0.714 → «71.4%»; null → «—». */
export function pct(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : '—';
}

/** ISO-дата происхождения в компактном виде: «2026-07-06 13:16 UTC». */
export function provenanceStamp(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]} UTC` : iso;
}
