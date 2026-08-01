/**
 * forecast-to-archive — адаптер четвёртого рода в живой архив персоны (#1590).
 *
 * Род «моё предсказание ↔ его исход» построен в forecast-record.mjs и пишет в
 * промежуточный журнал, который гитигнорирован. Настоящий дом объявлен самим блоком —
 * docs/virtual-team/memory/archive/<persona>.jsonl. Здесь ровно отображение, без fs и сети.
 *
 * Защита рода на границе: поле `predicted` НЕ пересекает адаптер. Наружу выходит только
 * текст, синтезированный из замороженного объекта один раз. Править в архиве нечего —
 * значит и «автор, поправивший предсказание после исхода» механически невозможен.
 *
 * Дискриминатор: `class: 'forecast'`. Поле `class` ортогонально `kind` — первое несёт род,
 * второе форму текста (`verbatim` | `summary`), и схема архива `class` не ограничивает.
 */

/** Дискриминатор рода в живом архиве. */
export const ARCHIVE_CLASS = 'forecast';

/** Кто произвёл запись — попадает в поле `source` архива. */
export const ARCHIVE_SOURCE = 'sprint-experience';

/**
 * Подвиды рода: один подвид — один автор — одна мерка.
 * Формы предложного падежа: запись читает человек, и «предсказание о нарезка» его спотыкает.
 */
export const SUBJECT_TITLES = Object.freeze({
  cut: 'нарезке',
  stop: 'остановках',
});

/**
 * Наступил ли исход. Запись без второго момента — законное «нет»: она существует,
 * но в архив не едет. Иначе род теряет то единственное, чем отличается от прочих.
 * @param {Record<string, unknown>} forecast
 * @returns {boolean}
 */
export function outcomeObserved(forecast) {
  return typeof forecast?.observedAt === 'string' && forecast.observedAt.length > 0;
}

/**
 * Дата для поля `ts` архива: календарный день исхода, YYYY-MM-DD.
 * Живой архив хранит день, а не момент — читатель ищет запись по дню.
 * @param {string} iso
 * @returns {string}
 */
export function archiveDay(iso) {
  const day = String(iso ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`forecast-to-archive: не дата — ${iso}`);
  return day;
}

/**
 * Промах по одному числовому полю: абсолютный и относительный.
 * @param {number} predicted
 * @param {number} observed
 * @returns {{abs: number, rel: number|null}}
 */
export function miss(predicted, observed) {
  const abs = observed - predicted;
  const rel = predicted === 0 ? null : Math.round((abs / predicted) * 100);
  return { abs, rel };
}

/**
 * Разбор поблочный — форма подвида `cut`: предсказание несёт массив блоков с
 * `predictedChangedLines`, исход — массив замеров с `changedLines`. Плоское сравнение
 * ключей на такой форме молчит, поэтому подвид разбирается отдельно, а не «как получится».
 *
 * @param {Record<string, any>} forecast
 * @returns {string[]} пусто, если форма не поблочная
 */
export function blockLines(forecast) {
  const predictedBlocks = forecast?.predicted?.blocks;
  const observedBlocks = forecast?.observed?.blocks;
  if (!Array.isArray(predictedBlocks) || !Array.isArray(observedBlocks)) return [];

  const measured = new Map(observedBlocks.map((b) => [b.cutBlockId ?? b.blockId, b.changedLines]));
  const lines = [];
  let sumP = 0;
  let sumO = 0;

  for (const b of predictedBlocks) {
    const id = b.cutBlockId ?? b.blockId;
    const p = Number(b.predictedChangedLines);
    const o = measured.get(id);
    if (!Number.isFinite(p) || !Number.isFinite(o)) {
      lines.push(`${id}: замера нет — в мерку не входит.`);
      continue;
    }
    sumP += p;
    sumO += o;
    const { rel } = miss(p, o);
    const sign = o - p > 0 ? '+' : '';
    lines.push(`${id}: предсказал ${p}, вышло ${o} (${sign}${rel}%).`);
  }
  if (sumP > 0) {
    const { rel } = miss(sumP, sumO);
    const sign = sumO - sumP > 0 ? '+' : '';
    lines.push(`Суммой: ${sumP} против ${sumO} (${sign}${rel}%).`);
  }
  return lines;
}

/**
 * Текст записи. Требование к форме одно: читающий через месяц обязан понять свой промах,
 * не открывая исходных файлов. Поэтому в тексте есть и предсказанное, и вышедшее, и
 * промах числом, и срок между моментами — а не ссылка «см. прогон».
 *
 * @param {Record<string, any>} forecast
 * @returns {string}
 */
export function forecastText(forecast) {
  const title = SUBJECT_TITLES[forecast.subject] ?? forecast.subject;
  const lines = [`Предсказание о ${title} и его исход.`];

  const perBlock = blockLines(forecast);
  if (perBlock.length > 0) {
    lines.push(...perBlock);
    const from = archiveDay(forecast.predictedAt);
    const to = archiveDay(forecast.observedAt);
    lines.push(from === to ? `Оба момента в один день, ${to}.` : `Предсказано ${from}, исход ${to}.`);
    if (typeof forecast.lesson === 'string' && forecast.lesson.trim() !== '') {
      lines.push(`Урок: ${forecast.lesson.trim().replace(/[.\s]*$/u, '')}.`);
    }
    return lines.join(' ');
  }

  const predicted = forecast.predicted ?? {};
  const observed = forecast.observed ?? {};
  const keys = Object.keys(predicted);

  for (const key of keys) {
    const p = predicted[key];
    const o = observed[key];
    if (typeof p === 'number' && typeof o === 'number') {
      const { abs, rel } = miss(p, o);
      const sign = abs > 0 ? '+' : '';
      const relText = rel === null ? 'доля не считается от нуля' : `${sign}${rel}%`;
      lines.push(`${key}: предсказал ${p}, вышло ${o} — промах ${sign}${abs} (${relText}).`);
    } else {
      lines.push(`${key}: предсказал ${JSON.stringify(p)}, вышло ${JSON.stringify(o)}.`);
    }
  }
  if (keys.length === 0) lines.push('Предсказание пусто — сравнивать нечего.');

  const from = archiveDay(forecast.predictedAt);
  const to = archiveDay(forecast.observedAt);
  lines.push(from === to ? `Оба момента в один день, ${to}.` : `Предсказано ${from}, исход ${to}.`);

  if (typeof forecast.lesson === 'string' && forecast.lesson.trim() !== '') {
    lines.push(`Урок: ${forecast.lesson.trim().replace(/[.\s]*$/u, '')}.`);
  }
  return lines.join(' ');
}

/**
 * Отобразить forecast-запись в запись живого архива персоны.
 *
 * Проверяет ровно свой контракт: подвид из закрытого множества, оба момента, их порядок,
 * автор и указатель. Валидность самой forecast-записи — забота вызывающего
 * (`validateForecastRecord`), годность результата — забота `recordProblems`: три уровня
 * не смешиваются, иначе ошибка теряет адрес.
 *
 * @param {Record<string, any>} forecast
 * @returns {{id: string, personaId: string, ts: string, provenance: string,
 *   source: string, kind: string, fullRef: string, text: string, class: string}}
 */
export function forecastToArchiveRecord(forecast, { defaultRef = null } = {}) {
  if (forecast === null || typeof forecast !== 'object') {
    throw new Error('forecast-to-archive: на входе не запись');
  }
  const { id, personaId, subject, predictedAt, observedAt } = forecast;
  const ref = typeof forecast.ref === 'string' && forecast.ref.trim() !== '' ? forecast.ref : defaultRef;

  if (typeof personaId !== 'string' || personaId.trim() === '') {
    throw new Error('forecast-to-archive: personaId обязателен — запись без автора не учит');
  }
  if (!Object.prototype.hasOwnProperty.call(SUBJECT_TITLES, subject)) {
    throw new Error(`forecast-to-archive: подвид «${subject}» вне закрытого множества cut|stop`);
  }
  if (!outcomeObserved(forecast)) {
    throw new Error(
      'forecast-to-archive: исход не наступил — законное «нет», запись в архив не едет',
    );
  }
  if (typeof ref !== 'string' || ref.trim() === '') {
    throw new Error('forecast-to-archive: ref обязателен — конспект без указателя не существует');
  }
  const from = archiveDay(predictedAt);
  const to = archiveDay(observedAt);
  // Сравнение моментами, а не строками: у ISO со смещениями «09:00+03:00» и «07:00+00:00»
  // один момент и разные строки, поэтому лексикографический порядок здесь врёт.
  const fromMs = Date.parse(predictedAt);
  const toMs = Date.parse(observedAt);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new Error(`forecast-to-archive: момент не разбирается — ${predictedAt} / ${observedAt}`);
  }
  if (!(fromMs < toMs)) {
    throw new Error(
      `forecast-to-archive: порядок моментов нарушен — предсказано ${predictedAt}, исход ${observedAt}`,
    );
  }

  return {
    id: typeof id === 'string' && id !== '' ? id : `${personaId}-${to}-forecast-${subject}`,
    personaId,
    ts: to,
    // Провенанс — путь к источнику, как во всех живых записях, а не имя провода.
    provenance: ref,
    source: ARCHIVE_SOURCE,
    // Текст синтезирован, а не дословен — значит summary, а summary обязан нести указатель.
    kind: 'summary',
    fullRef: ref,
    text: forecastText({ ...forecast, predictedAt: from, observedAt: to }),
    class: ARCHIVE_CLASS,
  };
}

/**
 * Отобразить пачку. Записи без исхода отсеиваются и пересчитываются — молчаливого
 * пропуска нет: «ноль перенесено» и «нечего переносить» различаются вызывающим.
 *
 * @param {Array<Record<string, any>>} forecasts
 * @returns {{records: Array<object>, skipped: Array<{id: string, why: string}>}}
 */
export function forecastsToArchiveRecords(forecasts, options = {}) {
  const records = [];
  const skipped = [];
  for (const forecast of forecasts ?? []) {
    if (!outcomeObserved(forecast)) {
      skipped.push({ id: forecast?.id ?? '(без id)', why: 'исход не наступил' });
      continue;
    }
    records.push(forecastToArchiveRecord(forecast, options));
  }
  return { records, skipped };
}
