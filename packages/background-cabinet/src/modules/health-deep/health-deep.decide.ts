/**
 * Чистое решение `/health/deep` (кусок D #2121, вердикт M2 заседания
 * logging-observability-cut): предметные числа + пороги с физическим смыслом →
 * ok | warn | fail. Null-величина не судится (прибор честно говорит «не мерено»,
 * а не рисует зелёное).
 */

export type HealthDeepNumbers = {
  /** Длина ленты журнала (records): величина, предсказавшая бы аварию 23.08. */
  tapeLength: number | null;
  /** Задержка базы по последней пробе, мс. */
  dbLatencyMs: number | null;
  /** Доля доехавших записей за окно 900 с; null — источник expected ещё не подключён. */
  ingestArrivedRatio: number | null;
};

export type HealthDeepThresholds = {
  tapeWarn: number;
  /** null = fail по ленте НЕ вооружён: до α-калибровки лента судит не выше warn. */
  tapeFail: number | null;
  dbWarnMs: number;
  dbFailMs: number;
  ratioWarn: number;
  ratioFail: number;
};

/**
 * Стартовые пороги — ДО калибровки (протокол — CALIBRATION.md рядом):
 * лента: warn 2400 — фактический уровень аварии 23.08 (замерено, не подогнано);
 * fail по ленте НЕ вооружён (null) до α-замера: 24.08 в проде лента 3209 при базе
 * 2 мс давала busy — порог, снятый с квадратичного чтения, кричал зря (класс
 * «сигнализация станет шумом»); здоровая длинная лента — degraded, не тревога.
 * База: 1000/3000 мс; доля: 0,95/0,80 (вердикт M2). После калибровки α (C(N)≈αN²)
 * пороги ленты задаются env и fail вооружается.
 */
export const DEFAULT_HEALTH_DEEP_THRESHOLDS: HealthDeepThresholds = {
  tapeWarn: 2400,
  tapeFail: null,
  dbWarnMs: 1000,
  dbFailMs: 3000,
  ratioWarn: 0.95,
  ratioFail: 0.8,
};

export type HealthDeepLevel = 'ok' | 'warn' | 'fail';

export function decideHealthDeep(
  n: HealthDeepNumbers,
  t: HealthDeepThresholds = DEFAULT_HEALTH_DEEP_THRESHOLDS,
): HealthDeepLevel {
  const tapeFail = t.tapeFail !== null && n.tapeLength !== null && n.tapeLength >= t.tapeFail;
  const dbFail = n.dbLatencyMs !== null && n.dbLatencyMs >= t.dbFailMs;
  const ratioFail = n.ingestArrivedRatio !== null && n.ingestArrivedRatio < t.ratioFail;
  if (tapeFail || dbFail || ratioFail) return 'fail';

  const tapeWarn = n.tapeLength !== null && n.tapeLength >= t.tapeWarn;
  const dbWarn = n.dbLatencyMs !== null && n.dbLatencyMs >= t.dbWarnMs;
  const ratioWarn = n.ingestArrivedRatio !== null && n.ingestArrivedRatio < t.ratioWarn;
  if (tapeWarn || dbWarn || ratioWarn) return 'warn';

  return 'ok';
}
