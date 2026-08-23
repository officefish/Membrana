/**
 * Сторож append-only журналов под союзным слиянием (#2096) — чистое ядро.
 *
 * ЗАЧЕМ СТОРОЖ РЯДОМ С СОЮЗОМ. `merge=union` снимает конфликт — и вместе с ним снимает
 * последнее место, где человек смотрел на журнал глазами. Опыт 23.08: две стороны
 * дописали строки с ОДНИМ ключом и разным содержимым — союз склеил обе молча, без единого
 * маркера. До союза этот случай упирался в конфликт и разбирался руками. Значит союз без
 * сторожа обменивает громкую беду на тихую, а тихая хуже: строка-двойник живёт в вещдоке и
 * читается как две разных записи одного акта.
 *
 * ДВА ПРАВИЛА, И ОБА ПРОВЕРЕНЫ НА ДЕРЕВЕ ПЕРЕД ВВЕДЕНИЕМ (376 журналов, ноль нарушений —
 * значит любое будущее красное есть настоящий сигнал, а не наследство):
 *   1. в одном журнале нет двух строк с одним ключом и разным содержимым;
 *   2. в одном журнале нет точных повторов строки — в ленте, куда только дописывают,
 *      дважды записанный акт означает сбой записи либо потерянное слияние.
 *
 * ТРЕТЬЕ ПРАВИЛО — ПРО САМ КЛАСС. Соглашение «журнал живёт в `trail/` или `op-log/`»
 * работает, пока его соблюдают. Журнал, заведённый мимо соглашения, союза не получит и
 * начнёт конфликтовать — молча, и через месяц счёт снова пойдёт на классы. Поэтому ядро
 * умеет назвать `.jsonl`, который ПО ИСТОРИИ ведёт себя как журнал, но под правило не
 * попал: перечисление отстаёт от жизни, а предикат — нет.
 *
 * ФС здесь нет: пути, строки и замеры истории приходят значениями.
 */

/** Каталоги-носители соглашения. Список закрыт: новое имя — новое обсуждение, не тихий рост. */
export const JOURNAL_DIRS = Object.freeze(['trail', 'op-log']);

/** Каталог, отменяющий признак журнала: фикстуры лежат рядом, но журналами не являются. */
export const NOT_JOURNAL_DIRS = Object.freeze(['fixtures']);

/**
 * Имена-носители соглашения для журналов, живущих вне `trail/` и `op-log/`.
 * Замер 23.08 нашёл два таких: `docs/audit/one-shot-trail.jsonl` и `docs/comms/sent-log.jsonl`.
 * Имя — вторая ось соглашения, не список файлов: новый `*-log.jsonl` попадёт под правило сам.
 */
export const JOURNAL_SUFFIXES = Object.freeze(['-trail.jsonl', '-log.jsonl']);

/**
 * Журналы, чьё имя соглашению не отвечает и переименование которых дороже пользы.
 * Список ЯВНЫЙ и КОРОТКИЙ — и остаётся честным лишь потому, что третье правило зуба
 * замечает всякий новый журнал мимо соглашения. Без зуба этот список молча отстал бы.
 */
export const JOURNAL_EXCEPTIONS = Object.freeze(['docs/evidence/registry.jsonl']);

/** Поля-ключи в порядке предпочтения. Первое найденное и есть ключ записи. */
export const KEY_FIELDS = Object.freeze(['traceId', 'eventId', 'assertionId', 'id']);

/**
 * Покрыт ли путь соглашением о журналах.
 *
 * Сегментами, а не подстрокой: `docs/trailer/x.jsonl` журналом не является, хотя содержит
 * «trail». Ошибка подстроки тиха и потому опаснее ложного отказа.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isJournalPath(path) {
  if (typeof path !== 'string' || !path.endsWith('.jsonl')) return false;
  const segments = path.split('/').slice(0, -1);
  if (segments.some((s) => NOT_JOURNAL_DIRS.includes(s))) return false;
  if (JOURNAL_EXCEPTIONS.includes(path)) return true;
  if (JOURNAL_SUFFIXES.some((suffix) => path.endsWith(suffix))) return true;
  return segments.some((s) => JOURNAL_DIRS.includes(s));
}

/**
 * Ключ записи: первое присутствующее поле из закрытого списка.
 *
 * Записи без ключа — законны (лента актов нарезки его не несёт), и молчание о них честнее
 * выдуманного составного ключа: составной ключ из «похожих» полей объявил бы двойниками
 * два разных акта одной персоны в одну секунду.
 *
 * @param {unknown} record
 * @returns {string|null}
 */
export function recordKey(record) {
  if (record === null || typeof record !== 'object') return null;
  for (const field of KEY_FIELDS) {
    const value = /** @type {Record<string, unknown>} */ (record)[field];
    if (typeof value === 'string' && value.trim() !== '') return `${field}:${value.trim()}`;
  }
  return null;
}

/**
 * Найти двойников в одном журнале.
 *
 * @param {string} body содержимое файла
 * @returns {{keyed: Array<{key: string, variants: string[]}>, exact: Array<{line: string, count: number}>, unreadable: number}}
 */
export function findJournalDuplicates(body) {
  const lines = String(body ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  const byLine = new Map();
  const byKey = new Map();
  let unreadable = 0;

  for (const line of lines) {
    byLine.set(line, (byLine.get(line) ?? 0) + 1);
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      unreadable += 1;
      continue;
    }
    const key = recordKey(record);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(line);
  }

  const exact = [...byLine.entries()]
    .filter(([, count]) => count > 1)
    .map(([line, count]) => ({ line, count }));
  const keyed = [...byKey.entries()]
    .filter(([, variants]) => variants.size > 1)
    .map(([key, variants]) => ({ key, variants: [...variants] }));

  return { keyed, exact, unreadable };
}

/**
 * Ведёт ли файл себя как журнал по своей истории.
 *
 * Мерка — доля удалённых строк. Чистого нуля требовать нельзя: у живых журналов есть
 * редкие корректирующие правки (замер 23.08 — одна на восемьдесят коммитов). А вот
 * переписываемый файл виден сразу: `docs/virtual-team/memory/archive` отдал 591 удалённую
 * строку в трёх правках.
 *
 * @param {{adds?: number, dels?: number, commits?: number}} stats
 * @returns {boolean}
 */
export function looksAppendOnly(stats) {
  const adds = Number(stats?.adds ?? 0);
  const dels = Number(stats?.dels ?? 0);
  const commits = Number(stats?.commits ?? 0);
  if (commits < 3 || adds < 5) return false; // слишком мало истории, чтобы судить
  return dels / Math.max(adds, 1) < 0.05;
}

/**
 * `.jsonl`, которые ведут себя как журналы, но соглашением не покрыты.
 *
 * Это и есть ответ на «покрывать КЛАСС, а не список»: соглашение держит имена, а предикат
 * замечает, когда класс вырос мимо имён.
 *
 * @param {Array<{path: string, adds?: number, dels?: number, commits?: number}>} observed
 * @returns {string[]}
 */
export function unguardedJournals(observed) {
  // Судим о КЛАССЕ, а не о файле. Замер 23.08: в `docs/virtual-team/memory/archive/` три
  // файла из шести чисто дописываются, а три переписаны (−192, −212, −187 строк). Чистые
  // не журналы — им просто не дошла очередь на перепись. Сосед по каталогу переписывается,
  // значит союзное слияние там неверно, и объявлять файл журналом по его личной удаче —
  // подгонка под желаемый ответ.
  const byDir = new Map();
  for (const o of observed ?? []) {
    if (typeof o?.path !== 'string' || isJournalPath(o.path)) continue;
    // Намеренно исключённое непокрытым не является. Фикстуры зубов дописываются так же, как
    // журналы, — потому что это записи журналов, застывшие как данные проверки. Союз им
    // ВРЕДЕН: у фикстуры важно последнее значение, и склеенные стороны сделали бы из неё
    // бессмыслицу, которую зуб принял бы за правду.
    if (o.path.split('/').some((s) => NOT_JOURNAL_DIRS.includes(s))) continue;
    const dir = o.path.slice(0, o.path.lastIndexOf('/'));
    const acc = byDir.get(dir) ?? { dir, adds: 0, dels: 0, commits: 0, paths: [] };
    acc.adds += Number(o.adds ?? 0);
    acc.dels += Number(o.dels ?? 0);
    acc.commits += Number(o.commits ?? 0);
    acc.paths.push(o.path);
    byDir.set(dir, acc);
  }
  const out = [];
  for (const acc of byDir.values()) if (looksAppendOnly(acc)) out.push(...acc.paths);
  return out.sort();
}
