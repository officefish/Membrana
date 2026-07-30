/**
 * nominate — детерминированный отбор 5–7 удачных прогонов на чтение ПЕРЕД спринтом.
 *
 * Функция ЧИСТАЯ и файлов не пишет вовсе — это и есть машинная проверка нормы живого снимка
 * `docs/cases/registry/NOMINATIONS.md`: «Только номинация — в канон запись делает человек по
 * слову владельца». Инструмент, сам пишущий кейс, ломает норму; рендер снимка — отдельный шаг.
 *
 * Единица отбора — ПРОГОН (окно спринта), а не запись: образец нарезки это целый план из
 * нескольких блоков, а не одна строка о блоке. Промахи из памяти не исчезают — их читает
 * память персоны; сюда, в пред-спринтовый фрейм, едет образец.
 *
 * ПОРОГА ДОПУСКА ПО `falseStopRate` НЕТ — решение владельца 30.07 (OWNER_ANSWERS §3):
 * номинировать без отсечки, метрику печатать РЯДОМ с номинацией, порог назначить позже по
 * накопленным данным. Прежний `≤ 0.2` снят ВМЕСТЕ С САМИМ ПОРОГОМ, а не заменён другим числом:
 * ложных остановок не измерено ни одной, и число до первого измерения — изобретение.
 * Качество прогона несёт ПОРЯДОК (ключ 1) и напечатанная рядом метрика, а не отсечка.
 *
 * У `cut` точка точности остаётся: `cutAccuracy = 1` — это не изобретённое число, а «все блоки
 * совпали»; вырожденный конец собственной шкалы, а не назначенная граница.
 */

/** Закрытый алфавит причин «не готов» — легальное «нет с причиной», не пустое поле. */
export const WAITING_REASONS = Object.freeze({
  'metric-undefined': 'метрика прогона не определена',
  'forecast-not-ratified': 'план нарезки не ратифицирован владельцем',
  'predicted-after-work': 'предсказание зафиксировано не до работы',
  'evidence-unresolved': 'вещдок не разрешается',
  'not-substantive': 'прогон на одном блоке/одной остановке доказывает совпадение, а не правило',
  'not-accurate': 'нарезка совпала не по всем блокам (cutAccuracy < 1)',
  'beyond-read-budget': 'годен, но выходит за окно чтения перед спринтом (восьмой выталкивает бриф)',
});

/**
 * @param {readonly object[]} runs прогоны: `{ runId, sprintId, subject, personaId, metric,
 *        observedAt, predictedAt, ratifiedBy, evidence }`
 * @param {{ min?: number, max?: number, resolveRef?: (ref: object) => {resolved: boolean, why?: string} }} [opts]
 * @returns {{ ready: object[], waiting: object[], thin: string|null }}
 */
export function nominateRuns(runs, opts = {}) {
  const min = Number.isInteger(opts.min) ? opts.min : 5;
  const max = Number.isInteger(opts.max) ? opts.max : 7;
  const resolveRef = typeof opts.resolveRef === 'function' ? opts.resolveRef : (() => ({ resolved: true }));

  const admitted = [];
  const waiting = [];
  for (const run of Array.isArray(runs) ? runs : []) {
    const verdict = admit(run, resolveRef);
    if (verdict.ok) admitted.push({ ...run, score: verdict.score, volume: verdict.volume });
    else waiting.push({ runId: run.runId, subject: run.subject, reason: verdict.reason, why: verdict.why });
  }

  admitted.sort(compareRuns);
  const ready = admitted.slice(0, max).map(toNomination);
  for (const extra of admitted.slice(max)) {
    waiting.push({
      runId: extra.runId,
      subject: extra.subject,
      reason: 'beyond-read-budget',
      why: WAITING_REASONS['beyond-read-budget'],
    });
  }
  waiting.sort((a, b) => (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0));

  // Окно достаточности, а не квота. Добора неточными прогонами до пяти НЕТ — это тот же
  // ратифицированный запрет M5, применённый к отбору: тонкий корпус нельзя выдавать за «лучшее».
  const thin = ready.length < min ? `корпус тонкий: ${ready.length} из ${min}` : null;
  return { ready, waiting, thin };
}

function admit(run, resolveRef) {
  const metric = run.metric;
  if (metric === undefined || metric === null) {
    return { ok: false, reason: 'metric-undefined', why: 'метрика прогона не посчитана' };
  }
  if (metric.defined === false) {
    return { ok: false, reason: 'metric-undefined', why: `метрика не определена: ${metric.reason}` };
  }
  // Условие 1: предсказание — ДО работы и (для cut) ратифицировано владельцем.
  if (!(typeof run.predictedAt === 'string' && typeof run.observedAt === 'string' && run.predictedAt < run.observedAt)) {
    return { ok: false, reason: 'predicted-after-work', why: WAITING_REASONS['predicted-after-work'] };
  }
  if (run.subject === 'cut' && run.ratifiedBy !== 'owner') {
    return { ok: false, reason: 'forecast-not-ratified', why: WAITING_REASONS['forecast-not-ratified'] };
  }
  // Условие 2: вещдоки РАЗРЕШАЮТСЯ. Неразрешимый вещдок отправляет прогон в waiting
  // с причиной, а не выбрасывает его молча.
  for (const ref of Array.isArray(run.evidence) ? run.evidence : []) {
    const r = resolveRef(ref);
    if (r.resolved !== true) {
      const why = typeof r.why === 'string' ? r.why : WAITING_REASONS['evidence-unresolved'];
      return { ok: false, reason: 'evidence-unresolved', why: `${ref.type}:${ref.value} — ${why}` };
    }
  }
  const volume = volumeOf(run.subject, metric);
  const score = scoreOf(run.subject, metric);
  // Условие 3: точность по своей мерке — только там, где у мерки есть конец шкалы.
  if (run.subject === 'cut' && metric.value !== 1) {
    return { ok: false, reason: 'not-accurate', why: WAITING_REASONS['not-accurate'] };
  }
  // Условие 4: содержательность.
  if (volume < 2) return { ok: false, reason: 'not-substantive', why: WAITING_REASONS['not-substantive'] };
  return { ok: true, score, volume };
}

function volumeOf(subject, metric) {
  if (subject === 'cut') {
    if (!Number.isInteger(metric.pair.blocksCount)) throw new Error('nominate: пара blocksCount обязательна рядом с cutAccuracy');
    return metric.pair.blocksCount;
  }
  if (subject === 'stop') {
    if (!Number.isInteger(metric.pair.stopsCount)) throw new Error('nominate: пара stopsCount обязательна рядом с falseStopRate');
    return metric.pair.stopsCount;
  }
  throw new Error(`nominate: subject «${String(subject)}» вне перечня (cut | stop)`);
}

/** Точность в единой ориентации «больше — лучше»: у `stop` мерка перевёрнута (ниже — лучше). */
function scoreOf(subject, metric) {
  return subject === 'cut' ? metric.value : 1 - metric.value;
}

/** Порядок полностью определён; последний ключ — `runId`, поэтому вход → снимок бит-в-бит. */
function compareRuns(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.volume !== a.volume) return b.volume - a.volume;
  if (a.observedAt !== b.observedAt) return a.observedAt < b.observedAt ? 1 : -1;
  return a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0;
}

function toNomination(run) {
  return {
    runId: run.runId,
    sprintId: run.sprintId,
    subject: run.subject,
    personaId: run.personaId,
    volume: run.volume,
    observedAt: run.observedAt,
    // Метрика едет РЯДОМ с номинацией — требование владельца вместо отсечки.
    metric: run.metric,
  };
}
