/**
 * Ядро зуба полноты реестра ADR (#2412).
 *
 * ЗАЧЕМ. `docs/adr/README.md` сам объявляет правило: «Реестр обязан содержать ВСЕ ADR:
 * запись без строки здесь невидима — её не найдёт ни человек, ни агент». Требование было
 * объявлено и не исполнено: `ADR-0027` и `ADR-0028` лежали в каталоге без строк в реестре.
 *
 * Объявленное, но не исполняемое правило хуже отсутствующего: на него ссылаются как на
 * действующее, а держится оно на внимательности. Зуб делает требование проверяемым.
 *
 * ЧТО СУДИТСЯ: файл записи ↔ строка реестра, в обе стороны.
 *   - запись без строки — невидима (ровно случай 0027/0028);
 *   - строка без файла — ссылка в никуда, реестр врёт о наличии.
 * Плюс уникальность номера: README требует, чтобы номер не переиспользовался.
 *
 * ЧТО НЕ СУДИТСЯ: дата, статус и тема строки. Это содержание записи, а не полнота реестра;
 * судить его отсюда значило бы завести второй источник истины о самой записи.
 *
 * Чистые функции; ФС и печать — у вызывающего.
 */

/** Файлы каталога, которые записями не являются. */
const NOT_A_RECORD = new Set(['README.md', 'ADR_TEMPLATE.md']);

/**
 * Имена файлов записей среди всех файлов каталога.
 * @param {readonly string[]} fileNames
 * @returns {string[]} отсортированные имена файлов-записей
 */
export function recordFiles(fileNames) {
  return [...fileNames]
    .filter((f) => f.endsWith('.md') && !NOT_A_RECORD.has(f))
    .sort();
}

/**
 * Номер ADR по имени файла — только для канонической формы `ADR-NNNN-<slug>.md`.
 *
 * Почему историческая форма `0006-<slug>.md` номера НЕ получает, хотя цифры у неё есть.
 * Реестр сам пишет её иначе: все прочие строки озаглавлены `ADR-NNNN`, а эта —
 * `0006-benchmark-runs-calibrated-preset`, без префикса. То есть номера в последовательности
 * ADR у неё нет: цифры принадлежат её собственной нумерации прогонов, а не реестру решений.
 * Считать их номером ADR значило бы объявить столкновение с `ADR-0006` там, где его нет.
 *
 * Полноты реестра это не ослабляет: строка в README от такой записи требуется наравне со
 * всеми — `recordFiles` её считает, и без строки она будет находкой.
 *
 * @param {string} fileName
 * @returns {string|null} номер из четырёх цифр или null, если имя не в канонической форме
 */
export function recordNumber(fileName) {
  const m = /^ADR-(\d{4})-/u.exec(String(fileName));
  return m ? m[1] : null;
}

/**
 * Ссылки на файлы каталога, встречающиеся в тексте реестра.
 *
 * Берётся markdown-ссылка `](./<файл>)` — именно она делает строку годной к переходу.
 * Упоминание номера прозой строкой реестра не является: по нему не перейти.
 *
 * @param {string} readmeText
 * @returns {Set<string>} имена файлов, на которые реестр ссылается
 */
export function linkedFiles(readmeText) {
  const out = new Set();
  for (const m of String(readmeText).matchAll(/\]\(\.\/([A-Za-z0-9._-]+\.md)\)/gu)) out.add(m[1]);
  return out;
}

/**
 * Полнота реестра в обе стороны плюс уникальность номеров.
 *
 * @param {readonly string[]} fileNames содержимое каталога docs/adr
 * @param {string} readmeText текст docs/adr/README.md
 * @returns {{missingRows: string[], danglingRows: string[], duplicateNumbers: Array<{number: string, files: string[]}>}}
 */
export function registryGaps(fileNames, readmeText) {
  const records = recordFiles(fileNames);
  const linked = linkedFiles(readmeText);
  const present = new Set(records);

  const missingRows = records.filter((f) => !linked.has(f));
  const danglingRows = [...linked]
    .filter((f) => !NOT_A_RECORD.has(f) && !present.has(f))
    .sort();

  const byNumber = new Map();
  for (const f of records) {
    const n = recordNumber(f);
    if (!n) continue;
    if (!byNumber.has(n)) byNumber.set(n, []);
    byNumber.get(n).push(f);
  }
  const duplicateNumbers = [...byNumber.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([number, files]) => ({ number, files: files.sort() }))
    .sort((a, b) => (a.number < b.number ? -1 : 1));

  return { missingRows, danglingRows, duplicateNumbers };
}
