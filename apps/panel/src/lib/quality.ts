/**
 * Чистая математика/форматтеры drift-борда (#454, консилиум
 * quality-control-contour): типы записей office, возраст, сравнение prod↔main.
 * Всё тестируемо без сети и DOM. Борд detector-compare — задача #452 со своим
 * артефактом (консилиум detector-compare-board-2026-07-14), сюда не тянуть.
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
