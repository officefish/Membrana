/**
 * СРАВНИТЕЛЬНЫЙ СТЕНД: чистая математика сравнения двух путей — MFCC и гармоники на FFT.
 *
 * Блок `mfcc-compare-run` спринта `mfcc-compare-sprint`. DoD блока — НЕ детекция, а
 * сравнительный прогон: либо MFCC различает на нашем материале, либо нет, и второе тоже данные.
 *
 * Здесь нет ни ввода-вывода, ни часов, ни `Math.random`: сид и время приходят параметрами.
 * Всё, что печатается наружу, живёт в `run-compare.mjs`, всё, что решает — здесь и под зубом.
 *
 * ЧТО СРАВНИВАЕТСЯ (вердикт тимлида, прогон `docs/discussions/mfcc-compare-run-tarasov.md`):
 * ROC-AUC на ОДНОМ неподвижном тесте. Гармонический путь отдаёт confidence 0..1, MFCC —
 * вектор коэффициентов; величины разной природы, и сравнивать их напрямую запрещено. Общей
 * величиной сделан ранговый балл: у гармоники — её confidence, у MFCC — разность расстояний
 * до центроидов классов, обученных ТОЛЬКО на train. ROC-AUC инвариантен к монотонному
 * преобразованию балла, поэтому «разность расстояний» и «вероятность» сопоставимы по AUC —
 * и только по нему.
 */
import { rocAuc } from '../lib/benchmark-metrics.mjs';

/** Список вердиктов закрыт: открытый список означал бы обход предиката новым словом. */
export const VERDICTS = Object.freeze([
  'mfcc_discriminates',
  'chance_not_excluded',
  'parity',
  'mfcc_worse',
  'mfcc_better',
  'undecided_corpus_bias',
  'no_corpus',
]);

/**
 * Предикат конфаундера: привязаны ли классы к РАЗНЫМ источникам записи.
 *
 * Требование тимлида на ревью: пока нет набора «один тракт — два класса», направленный вердикт
 * («MFCC лучше гармоники») не имеет права печататься — MFCC хрупок к рассогласованию канала,
 * и различие классов может оказаться различием аппаратуры. Источники не объявлены — это тоже
 * не «чисто», а неизвестность, и она понижает вердикт так же.
 */
export function corpusBias(sources) {
  if (!sources || !Array.isArray(sources.drone) || !Array.isArray(sources.notDrone)) {
    return { biased: true, reason: 'источники записи не объявлены — общий тракт не подтверждён' };
  }
  const shared = sources.drone.filter((s) => sources.notDrone.includes(s));
  if (shared.length > 0) return { biased: false, reason: `общие источники: ${shared.join(', ')}` };
  return {
    biased: true,
    reason: `классы из непересекающихся источников (${sources.drone.length} против ${sources.notDrone.length}) — тракт записи совпадает с меткой класса`,
  };
}

/**
 * Детерминированный генератор: сид параметром, состояние — своё.
 * `Math.random` в стенде запрещён: прогон обязан воспроизводиться по сиду, а не «примерно».
 */
export function seededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/**
 * Группа записи: куски одного полёта обязаны ехать по одну сторону сплита.
 * Правило то же, что в `scripts/lab-learning-curve.mjs`, — не изобретаем вторую мерку.
 */
export function groupOf(id) {
  const rec = id.match(/^(.*?)[-_]\d{3,4}$/);
  if (rec) return `rec:${rec[1]}`;
  const esc = id.match(/^(\d+-\d+)-/);
  if (esc) return `esc:${esc[1]}`;
  return `solo:${id}`;
}

/**
 * Неподвижный тест отбирается ГРУППАМИ, а не сэмплами: иначе два куска одного полёта
 * оказываются по разные стороны, и AUC меряет память о записи, а не различение класса.
 */
export function splitByGroups(items, { seed = 7, testShare = 0.35 } = {}) {
  const groups = [...new Set(items.map((i) => i.group))].sort();
  const rng = seededRng(seed);
  const shuffled = [...groups];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const testGroups = new Set();
  let count = 0;
  for (const g of shuffled) {
    if (count >= items.length * testShare) break;
    testGroups.add(g);
    count += items.filter((i) => i.group === g).length;
  }
  const test = items.filter((i) => testGroups.has(i.group));
  const train = items.filter((i) => !testGroups.has(i.group));
  return { train, test, testGroups: [...testGroups].sort() };
}

/**
 * Утечка групп между train и test. Печатается ВСЕГДА, даже когда равна нулю: «утечки нет»
 * должно быть видно как измеренное, а не подразумеваться.
 */
export function groupLeak(train, test) {
  const trainGroups = new Set(train.map((i) => i.group));
  return [...new Set(test.map((i) => i.group))].filter((g) => trainGroups.has(g)).sort();
}

/** Покомпонентное среднее набора векторов одинаковой длины. */
export function meanVector(vectors) {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const out = new Float64Array(dim);
  for (const v of vectors) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= vectors.length;
  return out;
}

/**
 * Модель MFCC-балла: два центроида и ОДНА общая диагональная дисперсия.
 *
 * Тимлид назвал расстояние Махаланобиса. Полную ковариацию я не считаю сознательно и говорю
 * об этом вслух: при 30 коэффициентах и ~40 дронах в train матрица 30×30 вырождена, её
 * обращение даёт красивое число из шума. Диагональная дисперсия — то же расстояние с
 * честно объявленным упрощением, а не «Махаланобис» на словах.
 */
export function fitCentroidModel(trainItems) {
  const drone = trainItems.filter((i) => i.truthDrone).map((i) => i.vector);
  const other = trainItems.filter((i) => !i.truthDrone).map((i) => i.vector);
  if (drone.length < 2 || other.length < 2) {
    return { defined: false, reason: `в train дронов ${drone.length}, не-дронов ${other.length} — центроид не строится` };
  }
  const droneMean = meanVector(drone);
  const otherMean = meanVector(other);
  const dim = droneMean.length;
  const variance = new Float64Array(dim);
  for (const [vectors, mean] of [[drone, droneMean], [other, otherMean]]) {
    for (const v of vectors) for (let i = 0; i < dim; i++) variance[i] += (v[i] - mean[i]) ** 2;
  }
  const dof = drone.length + other.length - 2;
  for (let i = 0; i < dim; i++) variance[i] = variance[i] / dof || 1e-12;
  return { defined: true, droneMean, otherMean, variance, trainDrone: drone.length, trainOther: other.length };
}

/** Расстояние с диагональной ковариацией. Упрощение названо в `fitCentroidModel`. */
export function diagDistance(vector, mean, variance) {
  let acc = 0;
  for (let i = 0; i < mean.length; i++) acc += (vector[i] - mean[i]) ** 2 / variance[i];
  return Math.sqrt(acc);
}

/**
 * Балл MFCC: ближе к дрону, чем к не-дрону, — больше балл. Монотонная величина, годная
 * для ROC-AUC; вероятностью она не является и печататься как процент не должна.
 */
export function mfccScore(model, vector) {
  return diagDistance(vector, model.otherMean, model.variance) - diagDistance(vector, model.droneMean, model.variance);
}

/** ROC-AUC с честным «нет»: один класс пуст — это не ноль, а неопределённость с причиной. */
export function aucOf(scored) {
  const pos = scored.filter((s) => s.truthDrone).length;
  const neg = scored.length - pos;
  if (pos === 0 || neg === 0) {
    return { defined: false, reason: `в тесте дронов ${pos}, не-дронов ${neg} — AUC не определён` };
  }
  return { defined: true, value: rocAuc(scored), positives: pos, negatives: neg };
}

/**
 * Доверительный интервал AUC бутстрепом. Порог сравнения из литературы брать запрещено,
 * поэтому мерка берётся из САМИХ данных: ширина интервала на этом же корпусе.
 */
export function bootstrapAucCi(scored, { seed = 11, resamples = 1000, alpha = 0.1 } = {}) {
  const base = aucOf(scored);
  if (!base.defined) return { defined: false, reason: base.reason };
  const rng = seededRng(seed);
  const values = [];
  for (let r = 0; r < resamples; r++) {
    const sample = [];
    for (let i = 0; i < scored.length; i++) sample.push(scored[Math.floor(rng() * scored.length)]);
    const a = aucOf(sample);
    if (a.defined) values.push(a.value);
  }
  if (values.length === 0) return { defined: false, reason: 'все пересборки вырождены — интервал не строится' };
  values.sort((x, y) => x - y);
  const at = (p) => values[Math.min(values.length - 1, Math.max(0, Math.round(p * (values.length - 1))))];
  return { defined: true, value: base.value, low: at(alpha / 2), high: at(1 - alpha / 2), resamples: values.length };
}

/** Доля перекрытия двух интервалов от ширины более узкого. Без неё «разница» — впечатление. */
export function overlapFraction(a, b) {
  if (!a?.defined || !b?.defined) return { defined: false, reason: 'один из интервалов не определён' };
  const inter = Math.min(a.high, b.high) - Math.max(a.low, b.low);
  const narrow = Math.min(a.high - a.low, b.high - b.low);
  if (narrow <= 0) return { defined: false, reason: 'нулевая ширина интервала' };
  return { defined: true, value: Math.max(0, inter) / narrow };
}

/**
 * ПРЕДИКАТ 1 — различает ли MFCC вообще. Тимлид ответил про «не хуже гармоники» и пропустил
 * абсолютный вопрос, а DoD блока стоит именно на нём: «различает либо нет». Достраиваю:
 * различает ⟺ нижняя граница интервала AUC строго выше 0.5 (случайного угадывания).
 */
export function discriminationVerdict(ci) {
  if (!ci?.defined) return { verdict: 'no_corpus', reason: ci?.reason ?? 'интервал не определён' };
  if (ci.low > 0.5) return { verdict: 'mfcc_discriminates', reason: `нижняя граница AUC ${ci.low.toFixed(3)} > 0.5` };
  return { verdict: 'chance_not_excluded', reason: `нижняя граница AUC ${ci.low.toFixed(3)} ≤ 0.5 — случайность не исключена` };
}

/**
 * ПРЕДИКАТ 2 — сравнение путей. Порог паритета 0.05 назван тимлидом; он `//provisional`
 * ровно до первого измерения на живом наборе, и в отчёте помечен как назначенный, не мерянный.
 */
export function comparisonVerdict(mfccCi, harmonicCi, { parityDelta = 0.05, bias = null } = {}) {
  if (!mfccCi?.defined || !harmonicCi?.defined) {
    return { verdict: 'no_corpus', reason: mfccCi?.reason ?? harmonicCi?.reason ?? 'интервалы не определены' };
  }
  const delta = mfccCi.value - harmonicCi.value;
  const overlap = overlapFraction(mfccCi, harmonicCi);
  if (Math.abs(delta) <= parityDelta) {
    return { verdict: 'parity', delta, overlap, reason: `|ΔAUC| ${Math.abs(delta).toFixed(3)} ≤ ${parityDelta}` };
  }
  // Направленный вердикт пропускается ТОЛЬКО на наборе без конфаундера тракта.
  if (bias?.biased) {
    return { verdict: 'undecided_corpus_bias', delta, overlap, reason: bias.reason };
  }
  return {
    verdict: delta < 0 ? 'mfcc_worse' : 'mfcc_better',
    delta,
    overlap,
    reason: `ΔAUC ${delta.toFixed(3)}, перекрытие интервалов ${overlap.defined ? overlap.value.toFixed(2) : '—'}`,
  };
}
