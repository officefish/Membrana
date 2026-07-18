/**
 * Pure metrics for detector benchmark reports.
 */

/** @param {{ truthDrone: boolean; predDrone: boolean }[]} pairs */
export function confusionFromPairs(pairs) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const { truthDrone, predDrone } of pairs) {
    if (truthDrone && predDrone) tp++;
    else if (!truthDrone && predDrone) fp++;
    else if (truthDrone && !predDrone) fn++;
    else tn++;
  }
  return { tp, fp, fn, tn };
}

export function precision(tp, fp) {
  const d = tp + fp;
  return d === 0 ? null : tp / d;
}

export function recall(tp, fn) {
  const d = tp + fn;
  return d === 0 ? null : tp / d;
}

export function f1Score(prec, rec) {
  if (prec == null || rec == null || prec + rec === 0) return null;
  return (2 * prec * rec) / (prec + rec);
}

export function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMs(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

/** @param {number[]} sorted ascending */
export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function sortNumbers(values) {
  return [...values].sort((a, b) => a - b);
}

// --- Метрики, не зависящие от классового состава корпуса -------------------
//
// Precision СМЕШИВАЕТ классы: `TP/(TP+FP)` меняется от того, сколько негативов
// положили в выборку. Значит цифра precision без указания приора не имеет
// одного смысла — на сбалансированном стенде она одна, в боевом потоке (где
// дрона нет почти всегда) другая. P_fa и P_d класс-условные: считаются внутри
// своего класса и от состава не зависят.

/** Доля ложных срабатываний на негативах: `FP/(FP+TN)`. Приор-независима. */
export function falseAlarmRate(fp, tn) {
  const d = fp + tn;
  return d === 0 ? null : fp / d;
}

/**
 * Precision, пересчитанная под произвольный приор.
 *
 * @param {number} pd доля обнаружения (recall), класс-условная
 * @param {number} pfa доля ложных на негативах, класс-условная
 * @param {number} prior доля позитивов в потоке (0..1)
 */
export function precisionAtPrior(pd, pfa, prior) {
  if (pd == null || pfa == null) return null;
  if (!(prior > 0 && prior < 1)) return null;
  const num = prior * pd;
  const den = num + (1 - prior) * pfa;
  return den === 0 ? null : num / den;
}

/**
 * Кривая precision по приору: одна цифра лжёт, кривая — нет.
 *
 * Приор НЕ назначается кодом: боевую рабочую точку выбирает владелец, глядя на
 * кривую. Ряд намеренно уходит до 1:1000 — плагин микрофона слушает постоянно,
 * и дрон в потоке редок.
 */
/**
 * Лестница задаётся СООТНОШЕНИЕМ «1 дрон на N тишины», а не долей: доля 0.1 —
 * это 1:9, и на такой мелочи легко подменить смысл цифры.
 */
export const PRIOR_LADDER_RATIOS = [1, 10, 100, 1000];

export function precisionByPrior(pd, pfa, ratios = PRIOR_LADDER_RATIOS) {
  return ratios.map((n) => {
    const prior = 1 / (1 + n);
    return { ratio: `1:${n}`, prior, precision: precisionAtPrior(pd, pfa, prior) };
  });
}

/**
 * ROC-AUC по рангам (статистика Манна–Уитни): вероятность того, что случайный
 * позитив получит балл выше случайного негатива. **Приор-независима** — не
 * зависит от соотношения классов в выборке, в отличие от PR-AUC.
 * Совпадающие баллы делятся поровну (0.5).
 *
 * @param {{ truthDrone: boolean; maxConfidence: number }[]} scored
 */
export function rocAuc(scored) {
  const pos = scored.filter((s) => s.truthDrone).map((s) => s.maxConfidence);
  const neg = scored.filter((s) => !s.truthDrone).map((s) => s.maxConfidence);
  if (pos.length === 0 || neg.length === 0) return null;
  let wins = 0;
  for (const p of pos) {
    for (const n of neg) {
      if (p > n) wins += 1;
      else if (p === n) wins += 0.5;
    }
  }
  return wins / (pos.length * neg.length);
}

/**
 * Average precision (площадь под PR-кривой) по убыванию балла.
 *
 * ВНИМАНИЕ: PR-AUC, в отличие от ROC-AUC, **зависит от классового состава** —
 * сравнивать её можно только между прогонами с одинаковым балансом. Поэтому в
 * отчёт она едет рядом с фактическим балансом выборки, а не сама по себе.
 *
 * @param {{ truthDrone: boolean; maxConfidence: number }[]} scored
 */
export function averagePrecision(scored) {
  const positives = scored.filter((s) => s.truthDrone).length;
  if (positives === 0 || scored.length === 0) return null;
  const ranked = [...scored].sort((a, b) => b.maxConfidence - a.maxConfidence);

  let tp = 0;
  let fp = 0;
  let prevRecall = 0;
  let ap = 0;
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i].truthDrone) tp++;
    else fp++;
    // Порог режет только между разными баллами: связка обязана учитываться целиком.
    const isBoundary =
      i === ranked.length - 1 || ranked[i].maxConfidence !== ranked[i + 1].maxConfidence;
    if (!isBoundary) continue;
    const rec = tp / positives;
    const prec = tp + fp === 0 ? 0 : tp / (tp + fp);
    ap += (rec - prevRecall) * prec;
    prevRecall = rec;
  }
  return ap;
}

/**
 * Доверительный интервал Уилсона для доли — честнее нормального на малых
 * выборках и у краёв (0 и 1), где нормальный вылезает за [0,1].
 * По умолчанию 95% (z = 1.96).
 */
/**
 * Полный набор метрик детектора по `perSample` — единственное место сборки.
 * Раньше блок дублировался трижды (DSP / template-match / yamnet), и любая
 * новая метрика требовала трёх одинаковых правок.
 *
 * @param {{ truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} perSample
 * @param {number[]} sortedLatencies по возрастанию
 */
export function detectorMetrics(perSample, sortedLatencies) {
  const { tp, fp, fn, tn } = confusionFromPairs(perSample);
  const prec = precision(tp, fp);
  const rec = recall(tp, fn);
  const pfa = falseAlarmRate(fp, tn);

  return {
    tp,
    fp,
    fn,
    tn,
    precision: prec,
    recall: rec,
    f1: f1Score(prec, rec),
    // Класс-условные — не зависят от состава корпуса.
    pd: rec,
    pfa,
    pdCI: wilsonInterval(tp, tp + fn),
    pfaCI: wilsonInterval(fp, fp + tn),
    rocAuc: rocAuc(perSample),
    // Зависит от баланса: едет в отчёт вместе с ним.
    prAuc: averagePrecision(perSample),
    positiveShare: perSample.length === 0 ? null : (tp + fn) / perSample.length,
    // Кривая вместо точки: одна цифра precision без приора не имеет смысла.
    precisionByPrior: rec == null || pfa == null ? null : precisionByPrior(rec, pfa),
    latencyP50Ms: percentile(sortedLatencies, 50),
    latencyP95Ms: percentile(sortedLatencies, 95),
  };
}

export function wilsonInterval(successes, total, z = 1.96) {
  if (total === 0) return null;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const spread = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  return { low: Math.max(0, center - spread), high: Math.min(1, center + spread) };
}
