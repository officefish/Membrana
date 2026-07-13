/**
 * Дрейф-якоря детекторного контура — единый контракт трёх producer'ов.
 *
 * Консилиум drift-anchor-triggers 2026-07-12 (#404): «поведенческий якорь» = два
 * разных явления, ловятся в разных местах:
 *  - code-anchor  (input=const golden-корпус, код меняется)  → CI-гейт, жёсткий порог (блок merge);
 *  - data-anchor  (detector=const frozen-image, вход меняется) → серверное расписание, warning;
 *  - scheduled-code-anchor (пересборка из main + корпус)       → сервер раз в сутки, ловит «Прод ≠ main».
 *
 * Producer'ы (CI-скрипт, серверные джобы) пишут `DriftAnchorRecord` в общий журнал
 * через этот контракт — без прямых импортов друг друга. Вердикт выносят ТОЛЬКО чистые
 * функции ниже (producer'ы не дублируют логику); LLM к записям якорей не прикасается.
 *
 * Размещение в core (а не в @membrana/drift-anchor): ADR 0003 — ≥3 producer'а в разных
 * субстратах + потребители (алерт, UI кабинета); drift-anchor остаётся zero-dependency
 * утилитой морнинг-дайджеста.
 */

/** Что дрейфует: входные данные (при замороженном детекторе) или код детектора. */
export type DriftAnchorKind = 'data' | 'code';

/** Где поймано: CI-гейт (PR) или серверное расписание. */
export type DriftAnchorSource = 'ci' | 'schedule';

/** Вердикт якоря. Для code-anchor порог жёсткий: broken блокирует merge. */
export type DriftAnchorVerdict = 'ok' | 'drift' | 'broken';

/** Запись якоря в общем журнале — одна на прогон producer'а. */
export interface DriftAnchorRecord {
  readonly anchorKind: DriftAnchorKind;
  readonly anchorSource: DriftAnchorSource;
  /**
   * Версия детекторного кода: SHA последнего коммита, затронувшего
   * detectors/ensemble. Для data-anchor — версия, вшитая в frozen-image
   * (Математик: ночная метрика меряет данными детектор N-дневной давности —
   * возраст обязан быть виден рядом с вердиктом).
   */
  readonly detectorVersion: string;
  /** Момент заморозки образа (data-anchor). null для code-anchor — код свежий по определению. */
  readonly imageFrozenAt: string | null;
  /** Магнитуда дрейфа. Для code-anchor — максимальный регресс F1 по детекторам (≥0). */
  readonly delta: number;
  readonly verdict: DriftAnchorVerdict;
  /** Момент прогона (ISO). Проставляет producer, не чистая функция. */
  readonly takenAt: string;
  /** Метрика по детекторам: для code-anchor — F1 на эталонном корпусе (4 знака). */
  readonly metrics: Readonly<Record<string, number>>;
}

/** Контекст producer'а для сборки code-anchor записи (всё, что не выводится из метрик). */
export interface CodeAnchorMeta {
  readonly anchorSource: DriftAnchorSource;
  readonly detectorVersion: string;
  readonly takenAt: string;
}

/** Округление метрик до 4 знаков — против float-шума, как в golden-якоре DA2. */
function round4(value: number): number {
  return Number(value.toFixed(4));
}

/**
 * Собрать code-anchor запись: сравнение F1 текущего прогона корпуса с baseline.
 *
 * Семантика направленная — якорь ловит только РЕГРЕСС (падение F1); рост метрики
 * дрейфом не считается. Жёсткий порог консилиума: регресс > epsilon → 'broken'
 * (блок merge в CI-гейте); регресс в пределах epsilon → 'drift' (виден, не блокит);
 * детектор исчез из прогона → 'broken'. Новые детекторы попадают в metrics,
 * но baseline для них не изобретается.
 *
 * Чистая: без I/O/времени; детерминирована (корпус детерминирован — подтверждено
 * повторным прогоном v0.2: метрики совпадают до знака).
 *
 * Fail-closed (ADR 0003): пустой baseline, нечисловые значения метрик или порога →
 * 'broken' — блокирующий merge якорь не имеет права тихо пройти на мусорном входе
 * (NaN в сравнениях иначе даёт false и «зелёный» гейт).
 */
export function buildCodeAnchorRecord(
  baselineF1: Readonly<Record<string, number>>,
  currentF1: Readonly<Record<string, number>>,
  epsilon: number,
  meta: CodeAnchorMeta,
): DriftAnchorRecord {
  let maxRegression = 0;
  let missing = false;
  let malformed = !Number.isFinite(epsilon) || Object.keys(baselineF1).length === 0;

  for (const [name, base] of Object.entries(baselineF1)) {
    if (!Number.isFinite(base)) {
      malformed = true;
      continue;
    }
    const current = currentF1[name];
    if (current === undefined) {
      missing = true;
      maxRegression = Math.max(maxRegression, round4(base));
      continue;
    }
    if (!Number.isFinite(current)) {
      malformed = true;
      continue;
    }
    const drop = round4(base) - round4(current);
    if (drop > maxRegression) maxRegression = drop;
  }

  const delta = round4(maxRegression);
  const verdict: DriftAnchorVerdict =
    malformed || missing || delta > epsilon ? 'broken' : delta > 0 ? 'drift' : 'ok';

  const metrics: Record<string, number> = {};
  for (const [name, value] of Object.entries(currentF1)) {
    metrics[name] = Number.isFinite(value) ? round4(value) : Number.NaN;
  }

  return {
    anchorKind: 'code',
    anchorSource: meta.anchorSource,
    detectorVersion: meta.detectorVersion,
    imageFrozenAt: null,
    delta,
    verdict,
    takenAt: meta.takenAt,
    metrics,
  };
}

/** Итог сверки code-anchor(CI) ↔ scheduled-code-anchor: «Прод ≠ main». */
export type ProdMainDivergenceVerdict = 'in-sync' | 'stale-ci' | 'diverged';

export interface ProdMainDivergence {
  readonly verdict: ProdMainDivergenceVerdict;
  /** Максимальное |ΔF1| между записями по общим детекторам. */
  readonly delta: number;
  readonly ciDetectorVersion: string;
  readonly scheduleDetectorVersion: string;
  /** Человекочитаемые причины вердикта (для danger-строки UI: иконка + текст, не только цвет). */
  readonly reasons: readonly string[];
}

/**
 * Сверить последнюю CI-запись с последней scheduled-записью code-anchor.
 *
 * - Разные `detectorVersion` → 'stale-ci': CI-запись от другой версии кода,
 *   сравнение метрик неинформативно (не danger, но возраст показать).
 * - Одна версия, но метрики разошлись > epsilon (или детектор пропал с одной
 *   стороны) → 'diverged' — алерт «Прод ≠ main»: прод-сборка ведёт себя не так,
 *   как тот же код в CI.
 */
export function evaluateProdMainDivergence(
  ci: DriftAnchorRecord,
  schedule: DriftAnchorRecord,
  epsilon: number,
): ProdMainDivergence {
  if (ci.anchorKind !== 'code' || schedule.anchorKind !== 'code') {
    throw new TypeError('evaluateProdMainDivergence принимает только code-anchor записи');
  }

  const base = {
    ciDetectorVersion: ci.detectorVersion,
    scheduleDetectorVersion: schedule.detectorVersion,
  };

  if (ci.detectorVersion !== schedule.detectorVersion) {
    return {
      ...base,
      verdict: 'stale-ci',
      delta: 0,
      reasons: [
        `CI-запись от ${ci.detectorVersion}, расписание собрано из ${schedule.detectorVersion} — версии кода разошлись, сравнение метрик неинформативно`,
      ],
    };
  }

  const reasons: string[] = [];
  let maxDelta = 0;
  const names = new Set([...Object.keys(ci.metrics), ...Object.keys(schedule.metrics)]);
  for (const name of names) {
    const a = ci.metrics[name];
    const b = schedule.metrics[name];
    if (a === undefined || b === undefined) {
      reasons.push(`детектор ${name} есть только в записи ${a === undefined ? 'schedule' : 'ci'}`);
      maxDelta = Math.max(maxDelta, round4(a ?? b ?? 0));
      continue;
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      // fail-visible: нечисловая метрика в журнале — само по себе расхождение
      reasons.push(`детектор ${name}: нечисловая метрика (ci=${a}, schedule=${b})`);
      continue;
    }
    const d = round4(Math.abs(a - b));
    if (d > maxDelta) maxDelta = d;
    if (d > epsilon) {
      reasons.push(`F1 ${name}: ci=${a} vs schedule=${b} (|Δ|=${d} > ε=${epsilon})`);
    }
  }

  const delta = round4(maxDelta);
  if (reasons.length > 0) {
    return { ...base, verdict: 'diverged', delta, reasons };
  }
  return { ...base, verdict: 'in-sync', delta, reasons: [] };
}
