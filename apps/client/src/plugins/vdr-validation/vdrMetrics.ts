import {
  VDR_GATE_HARD_F1,
  VDR_GATE_SOFT_F1,
  type VdrCorpusRow,
  type VdrGateMetrics,
} from './types';

/**
 * Метрики gate по pred-vs-truth (только labeled-строки; unlabeled и ошибки
 * исключаются — как в benchmark-харнессе). Пороги — консилиум 2026-07-03:
 * F1 ≥85% hard-gate, 80–85% мягкий, <80% team-разбор.
 */
export function computeVdrGateMetrics(rows: readonly VdrCorpusRow[]): VdrGateMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let unlabeled = 0;

  for (const row of rows) {
    if (row.error !== null) continue;
    if (row.truth === 'unlabeled') {
      unlabeled++;
      continue;
    }
    const truthIsDrone = row.truth === 'drone';
    if (row.predIsDrone && truthIsDrone) tp++;
    else if (row.predIsDrone && !truthIsDrone) fp++;
    else if (!row.predIsDrone && !truthIsDrone) tn++;
    else fn++;
  }

  const compared = tp + fp + tn + fn;
  if (compared === 0) {
    return {
      compared,
      unlabeled,
      tp,
      fp,
      tn,
      fn,
      precision: null,
      recall: null,
      f1: null,
      accuracy: null,
      gate: null,
    };
  }

  const precision = tp + fp === 0 ? null : tp / (tp + fp);
  const recall = tp + fn === 0 ? null : tp / (tp + fn);
  const f1 =
    precision === null || recall === null || precision + recall === 0
      ? null
      : (2 * precision * recall) / (precision + recall);
  const accuracy = (tp + tn) / compared;
  const gate =
    f1 === null ? null : f1 >= VDR_GATE_HARD_F1 ? 'hard' : f1 >= VDR_GATE_SOFT_F1 ? 'soft' : 'fail';

  return { compared, unlabeled, tp, fp, tn, fn, precision, recall, f1, accuracy, gate };
}
