/**
 * Сборка шаблона класса по ПЕРЦЕНТИЛЯМ распределения метрик.
 *
 * Зачем отдельно от существующей сборки: та строит «merged envelope» —
 * объемлющую рамку по всем сэмплам (`mergeCuratedDroneTemplate`). У envelope
 * есть свойство, губительное для обучения на объёме: **каждый новый сэмпл может
 * рамку только расширить, никогда не сузить**. На большом корпусе шаблон
 * становится всеядным, и конкуренция шаблонов решается не сходством, а шириной
 * (замер 18.07: MACHINE_HUM 0–9467 Гц ШИРЕ DRONE 329–8299 по обеим осям, отсюда
 * FPR 95–100% при добавлении конкурентов).
 *
 * Перцентильная рамка ведёт себя противоположно: с ростом выборки оценка
 * границы СХОДИТСЯ к истинному квантилю распределения, а не разбухает. Именно
 * это делает объём данных работающим рычагом.
 *
 * Прецедент: template-match уже увели с `DRONE_CURATED` (envelope) на
 * `DRONE_TIGHT` (перцентили + устойчивость во времени) — precision 55.6% → 85.5%.
 * Но там результат вписан КОНСТАНТАМИ (`scripts/benchmark-fft-trends.mjs:311-329`),
 * то есть от данных не зависит. Здесь он вычисляется.
 */
import { percentile, sortNumbers } from './benchmark-metrics.mjs';

/** Метрики, по которым строится «бокс» шаблона. */
export const TEMPLATE_METRICS = ['centroid', 'flux', 'rms'];

/** Границы по умолчанию — p10..p90: отсекает по десятой доле хвостов с каждой стороны. */
export const DEFAULT_LOW_PCT = 10;
export const DEFAULT_HIGH_PCT = 90;

/**
 * Перцентиль по неотсортированному массиву.
 * @param {number[]} values
 * @param {number} p
 */
export function pct(values, p) {
  return percentile(sortNumbers(values), p);
}

/** Стандартное отклонение — мера разброса метрики внутри одного сэмпла. */
export function std(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Объемлющая рамка — для сравнения с перцентильной. Именно так собраны все
 * семь текущих шаблонов; функция нужна, чтобы кривая по объёму могла показать
 * ОБА метода рядом.
 *
 * @param {number[][]} perSampleValues значения метрики по каждому сэмплу
 */
export function envelopeBounds(perSampleValues) {
  const flat = perSampleValues.flat();
  if (flat.length === 0) return null;
  return { min: Math.min(...flat), max: Math.max(...flat) };
}

/**
 * Перцентильная рамка по объединённому распределению.
 *
 * @param {number[][]} perSampleValues значения метрики по каждому сэмплу
 * @param {number} lowPct
 * @param {number} highPct
 */
export function percentileBounds(perSampleValues, lowPct = DEFAULT_LOW_PCT, highPct = DEFAULT_HIGH_PCT) {
  const flat = perSampleValues.flat();
  if (flat.length === 0) return null;
  return { min: pct(flat, lowPct), max: pct(flat, highPct) };
}

/**
 * Шаблон класса из траекторий метрик набора сэмплов.
 *
 * @param {{ centroid: number; flux: number; rms: number }[][]} perSampleMetrics
 *   траектории по каждому сэмплу (выход `collectMetricSamples`)
 * @param {object} opts
 * @param {string} opts.key ключ шаблона (префикс DRONE делает его детекцией)
 * @param {string} [opts.name]
 * @param {'percentile'|'envelope'} [opts.method] способ сборки границ
 * @param {number} [opts.lowPct]
 * @param {number} [opts.highPct]
 */
export function buildClassTemplate(perSampleMetrics, opts) {
  const { key, name = key, method = 'percentile', lowPct = DEFAULT_LOW_PCT, highPct = DEFAULT_HIGH_PCT } = opts;
  if (!key) throw new Error('buildClassTemplate: нужен key шаблона');

  const bounds = method === 'envelope' ? envelopeBounds : (v) => percentileBounds(v, lowPct, highPct);
  const thresholds = {};
  for (const metric of TEMPLATE_METRICS) {
    const perSample = perSampleMetrics.map((traj) => traj.map((m) => m[metric]).filter(Number.isFinite));
    const b = bounds(perSample);
    if (b != null) thresholds[metric] = b;
  }

  // Разброс centroid внутри сэмпла — признак устойчивости гула во времени.
  // Именно он отличает дрон от прочего: у дрона узкий, у речи широкий.
  const centroidStds = perSampleMetrics.map((traj) => std(traj.map((m) => m.centroid).filter(Number.isFinite)));
  const stdBound =
    method === 'envelope'
      ? { min: 0, max: centroidStds.length ? Math.max(...centroidStds) : 0 }
      : { min: 0, max: pct(centroidStds, highPct) ?? 0 };

  return {
    key,
    name,
    description:
      method === 'percentile'
        ? `Перцентильный шаблон p${lowPct}–p${highPct} из ${perSampleMetrics.length} сэмплов`
        : `Merged envelope из ${perSampleMetrics.length} сэмплов`,
    method,
    sampleCount: perSampleMetrics.length,
    thresholds,
    temporalPatterns: { centroidStd: stdBound },
  };
}

/**
 * Ширина рамки — мера всеядности шаблона. Растущая ширина при росте выборки
 * означает, что метод сборки НЕ обучается, а размывается.
 */
export function templateWidth(template, metric = 'centroid') {
  const b = template?.thresholds?.[metric];
  return b == null ? null : b.max - b.min;
}
