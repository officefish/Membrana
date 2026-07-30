/**
 * absence — закрытый алфавит ПРИЧИН ОТСУТСТВИЯ метрики + честный рендер.
 *
 * Ратифицированный запрет (вердикт M5 заседания `sprint-honest-performers`, 30.07):
 * «чисто» при пустом корпусе — это «корпуса нет». Ноль записей опыта ≠ «учиться нечему»;
 * ноль остановок ≠ «ложных нет». Поэтому у метрики ТРИ состояния, а не два, и третье —
 * именованное: `{ defined: false, reason }`, где reason из закрытого списка ниже.
 *
 * Несущее правило, проверяемое машинно: рядом с `defined: false` процент НЕ печатается
 * НИКОГДА — ни `0%`, ни `—%`, ни `n/a` в графе значения. Строка читается словами:
 * «не определена: остановок ноль — не „ложных нет“».
 */

/** Закрытый алфавит причин отсутствия: ключ → человеческая расшифровка. */
export const ABSENCE_REASONS = Object.freeze({
  'no-cut-forecast': 'предсказания нарезки нет — тимлид не резал или не записал',
  'no-observed-outcome': 'нарезка есть, ревью до блоков не дошло',
  'forecast-not-ratified': 'план не ратифицирован владельцем — предсказание нелегитимно',
  'no-attribution': 'сегменты ревью не привязаны к cutBlockId — исход не определён, а не ноль',
  'no-stops-recorded': 'остановок ноль — это НЕ «ложных нет»',
  'stops-unresolved': 'все остановки не разрешены — исход ещё не наблюдаем',
  // Расшифровки печатаются в графе значения вместо процента — поэтому в них СЛОВА и ни одной
  // цифры: любая цифра рядом с «не определена» немедленно читается как значение метрики.
  'no-lead-appointed': 'окно шло «без ведения» — за матч не выдаётся',
});

/** Причины, легальные для `cutAccuracy`. */
export const CUT_ABSENCE_REASONS = Object.freeze([
  'no-cut-forecast',
  'no-observed-outcome',
  'forecast-not-ratified',
  'no-attribution',
]);

/** Причины, легальные для `falseStopRate`. */
export const STOP_ABSENCE_REASONS = Object.freeze([
  'no-stops-recorded',
  'stops-unresolved',
  'no-lead-appointed',
]);

/** Принадлежит ли строка закрытому алфавиту. */
export function isAbsenceReason(reason) {
  return typeof reason === 'string' && Object.hasOwn(ABSENCE_REASONS, reason);
}

/**
 * Неопределённая метрика. Причина обязана быть из алфавита — иначе ошибка входа,
 * а не «прочее»: свободный текст причины вернул бы прозу на место предиката.
 */
export function absent(reason) {
  if (!isAbsenceReason(reason)) {
    throw new Error(`absence: причина «${String(reason)}» вне закрытого алфавита (${Object.keys(ABSENCE_REASONS).join(' | ')})`);
  }
  return Object.freeze({ defined: false, reason });
}

/**
 * Определённая метрика. `defined ⇔ denominator > 0` — единственный источник состояния;
 * значение считается вызывающим, здесь только упаковка с обязательными счётчиками и парой.
 */
export function present({ value, numerator, denominator, pair }) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new Error('absence: numerator и denominator обязаны быть целыми — доля без счётчиков скрывает ровно то же, что подстановка нуля');
  }
  if (denominator <= 0) {
    throw new Error('absence: denominator = 0 → метрика НЕ определена, используйте absent(reason)');
  }
  return Object.freeze({ defined: true, value, numerator, denominator, pair: Object.freeze(pair) });
}

/**
 * Графа ЗНАЧЕНИЯ метрики. При `defined: false` возвращает слова и ни одной цифры процента —
 * это и есть машинно проверяемое правило вывода №1.
 */
export function renderMetricValue(metric) {
  if (metric.defined === false) return `не определена: ${ABSENCE_REASONS[metric.reason]}`;
  const percent = `${(metric.value * 100).toFixed(1)}%`;
  return `${percent} (${metric.numerator}/${metric.denominator})`;
}

/** Строка метрики целиком: имя · значение · обязательная пара против Гудхарта. */
export function renderMetricLine(name, metric) {
  const head = `${name}: ${renderMetricValue(metric)}`;
  if (metric.defined === false) return head;
  const pairs = Object.entries(metric.pair).map(([k, v]) => `${k}=${renderPairValue(v)}`);
  return pairs.length === 0 ? head : `${head} · ${pairs.join(' · ')}`;
}

function renderPairValue(v) {
  if (v !== null && typeof v === 'object' && Object.hasOwn(v, 'numerator')) {
    return `${(v.value * 100).toFixed(1)}% (${v.numerator}/${v.denominator})`;
  }
  return String(v);
}

/**
 * Правило вывода №3: обе метрики неопределены → отчёт обязан сказать «корпуса опыта нет».
 * Ни «всё хорошо», ни молчание.
 */
export function renderCorpusVerdict(cutAccuracy, falseStopRate) {
  const defined = [cutAccuracy, falseStopRate].filter((m) => m.defined === true).length;
  if (defined === 0) return 'КОРПУСА ОПЫТА НЕТ: ни одна из двух метрик не определена — учиться пока не на чем';
  if (defined === 1) return 'корпус опыта НЕПОЛОН: определена одна метрика из двух — второй автор пока не учится';
  return 'корпус опыта есть: обе метрики определены';
}
