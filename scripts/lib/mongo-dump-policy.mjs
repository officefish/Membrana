/**
 * Политика дампов архивариуса: имена артефактов, пригодность манифеста, ретенция.
 *
 * Модуль ЧИСТЫЙ по построению: ни файловой системы, ни докера, ни сети, ни `Date.now()`.
 * Это не аскеза, а граница, названная резчиком при нарезке спринта `archivarius-mongo-dump`
 * дословно: «ядро здесь не io, а политика; политика не знает про пути и хосты, исполнитель
 * не принимает решений». Обратный порядок — скрипт сейчас, вынос политики потом — даёт
 * io-ком, у которого нельзя спросить ни одного проверяемого утверждения.
 *
 * `now` приходит параметром везде, где нужно время. Внутренний `Date.now()` сделал бы зубы
 * недетерминированными, а ретенцию — непроверяемой в тот единственный момент, когда её
 * поведение важно: при переходе через границу окна.
 *
 * Разбор Дынина 08.08 (прогон контекста исполнителя блока) вошёл сюда четырьмя решениями:
 * ретенция уровнями-данными, а не числом; закрытый перечень причин вместо строк; манифест
 * как предикат, а не опись; `sha256Of` отдельным полем — см. комментарии по месту.
 */

/**
 * Версия схемы манифеста. Без неё первый же рефактор поля ломает ретенцию задним числом.
 *
 * v2 (#1814, блок b3): опись — из содержимого артефакта (`inventorySource:
 * 'archive-contents'` обязателен), гард протокола mongodump переехал в
 * `protocolChecks.incompleteCollections`. Ось версии — ФОРМА манифеста; ось
 * inventorySource — откуда взяты данные; решение держателя блока: оси не смешивать,
 * валидация ветвится по schemaVersion, старые манифесты v1 остаются читаемыми ретенцией.
 */
export const MANIFEST_SCHEMA_VERSION = 2;

/** Читаемые версии. Закрытый список: неизвестная версия — непригодность, а не «наверное сойдёт». */
export const KNOWN_SCHEMA_VERSIONS = Object.freeze([1, 2]);

/**
 * Что именно хешировано. Отдельное поле, а не «просто sha256».
 *
 * Ловушка, названная Дыниным до кода: если хешировать файл, внутри которого лежит сам
 * манифест, получаешь либо циклическую зависимость, либо молчаливое рассогласование при
 * пересжатии. Поэтому субъект хеша объявляется явно и проверяется зубом.
 */
export const SHA256_SUBJECTS = Object.freeze(['mongodump-archive-body', 'gzip-stream']);

/**
 * Откуда взята опись. Тоже объявляется полем, и по той же причине.
 *
 * `mongodump-stderr` — исторический источник схемы v1: опись читалась из человекочитаемого
 * лога чужой утилиты. С v2 (#1814 закрыт) живой источник один — `archive-contents`: опись
 * снимается из содержимого артефакта конвейером `lib/archive-inventory.mjs` (восстановление
 * в изолированную цель — машинерия #1809). Значение v1 остаётся в списке ради чтения
 * старых манифестов; у v2 оно отвергается веткой валидации.
 */
export const INVENTORY_SOURCES = Object.freeze(['mongodump-stderr', 'archive-contents']);

/**
 * Закрытый перечень причин решения по каждому артефакту.
 *
 * Причина — код, а не фраза: зубы, ловящие строки, ломаются на первой же правке
 * формулировки, и тогда чинят зуб, а не смысл.
 */
export const RETENTION_REASONS = Object.freeze([
  'kept:within-daily-window',
  'kept:min-count',
  'kept:hard-floor',
  'dropped:superseded-by-newer',
  'dropped:corrupt-manifest',
  'dropped:over-hard-cap',
]);

/**
 * Политика по умолчанию.
 *
 * `maxAgeHours: 168` и `minCount: 7` — прямое следствие решения владельца 08.08: допустимое
 * окно потери — сутки, значит шаг суточный, и недели хватает, чтобы порча заметилась раньше,
 * чем последняя целая копия вытеснится. Недельных и месячных уровней здесь НЕТ сознательно:
 * разбор Дынина — «преждевременная сложность, вводить, когда появится второй потребитель
 * (offsite)». Оговорка честная: хранение на той же VDS, одна машина — один пожар.
 *
 * `minSizeBytes` — пол, а не мерка. Он отсекает нулевой и обрезанный файл; утверждать по нему
 * пригодность нельзя, для этого есть `dbInventory`.
 */
export const DEFAULT_RETENTION_POLICY = Object.freeze({
  tiers: Object.freeze([Object.freeze({ maxAgeHours: 168, minCount: 7 })]),
  hardCap: 14,
  minSizeBytes: 1024,
});

const NAME_RE = /^mongo-dump--(\d{8}T\d{9}Z)--([0-9A-Za-z._-]+)--([0-9a-f]{8})\.archive(\.gz)?$/u;
const SHA256_RE = /^[0-9a-f]{64}$/u;
const HOUR_MS = 3600_000;

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFilled = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Отметка времени в имени: UTC, базовый ISO, с миллисекундами.
 *
 * Три требования разом, каждое из названной ловушки. UTC с суффиксом `Z` — иначе перевод
 * часового пояса на сервере заставит сортировку строк соврать. Базовый ISO без разделителей —
 * тогда лексикографический порядок имён совпадает с хронологическим, и ретенция строится по
 * каталогу без чтения манифестов. Миллисекунды — иначе два прогона в одну секунду дают
 * коллизию имён, то есть тихую перезапись копии копией.
 *
 * @param {string} iso отметка в ISO 8601
 * @returns {string} например `20260808T161631042Z`
 */
export function toBasicUtc(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new TypeError(`отметка времени не читается: ${String(iso)}`);
  return new Date(ms).toISOString().replace(/[-:]/gu, '').replace('.', '');
}

/**
 * Имя артефакта.
 *
 * `shortSha` — первые 8 знаков `sha256` тела. Это делает имя проверяемым против манифеста
 * без внешнего индекса: рассогласование видно сравнением двух полей, а не расследованием.
 *
 * @param {{startedAt: string, mongoVersion: string, sha256: string, gzip?: boolean}} a
 * @returns {string}
 */
export function formatArtifactName({ startedAt, mongoVersion, sha256, gzip = true }) {
  if (!isFilled(mongoVersion) || mongoVersion.includes('--')) {
    throw new TypeError(`версия Mongo непригодна для имени: ${String(mongoVersion)}`);
  }
  if (!SHA256_RE.test(String(sha256))) {
    throw new TypeError(`sha256 не 64 шестнадцатеричных знака: ${String(sha256)}`);
  }
  const stamp = toBasicUtc(startedAt);
  return `mongo-dump--${stamp}--${mongoVersion}--${sha256.slice(0, 8)}.archive${gzip ? '.gz' : ''}`;
}

/**
 * Разбор имени — отдельная чистая функция, не смешанная с ретенцией (требование Дынина).
 *
 * Возвращает не исключение, а результат: нечитаемое имя — это состояние каталога, с которым
 * ретенция обязана уметь работать, а не аварийная ситуация.
 *
 * @param {string} name
 * @returns {{ok: true, startedAt: string, mongoVersion: string, shortSha: string, gzip: boolean}
 *          | {ok: false, problem: string}}
 */
export function parseArtifactName(name) {
  const m = typeof name === 'string' ? NAME_RE.exec(name) : null;
  if (!m) return { ok: false, problem: 'имя не по схеме mongo-dump--<UTC>--<версия>--<sha8>.archive[.gz]' };
  const [, stamp, mongoVersion, shortSha, gz] = m;
  const iso =
    `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T` +
    `${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}.${stamp.slice(15, 18)}Z`;
  if (Number.isNaN(Date.parse(iso))) return { ok: false, problem: `отметка времени в имени не существует: ${stamp}` };
  return { ok: true, startedAt: iso, mongoVersion, shortSha, gzip: Boolean(gz) };
}

/**
 * Дефекты манифеста. Пусто — манифест является предикатом пригодности, а не описью.
 *
 * Почему пяти полей из нарезки не хватило (разбор Дынина, дословный список):
 * `mongodumpExitCode` — без него «файл есть» ≠ «дамп прошёл»; `dbInventory` — без него пустой
 * дамп живой базы неотличим от полного; `startedAt` И `finishedAt` порознь — длительность сама
 * по себе сигнал, внезапно быстрый дамп подозрителен; `schemaVersion` — против рефактора задним
 * числом; `sha256Of` — против циклической зависимости при верификации.
 *
 * Проверка ВОССТАНОВЛЕНИЯ сюда не входит и входить не может: это соседняя карточка
 * `archivarius-mongo-restore-drill` (#1809). Пока она открыта, всё, что здесь утверждается, —
 * «артефакт снят и внутренне непротиворечив», а не «откат сработает».
 *
 * @param {unknown} m манифест
 * @param {{minSizeBytes?: number}} [opts]
 * @returns {string[]}
 */
export function manifestProblems(m, opts = {}) {
  const minSizeBytes = opts.minSizeBytes ?? DEFAULT_RETENTION_POLICY.minSizeBytes;
  if (!isPlainObject(m)) return ['манифест не объект — читать нечего'];
  const out = [];
  if (!KNOWN_SCHEMA_VERSIONS.includes(m.schemaVersion)) {
    out.push(`schemaVersion ∉ {${KNOWN_SCHEMA_VERSIONS.join(', ')}}: ${String(m.schemaVersion)}`);
  }
  for (const f of ['startedAt', 'finishedAt', 'mongoVersion', 'sourceHost']) {
    if (!isFilled(m[f])) out.push(`${f} пуст`);
    else if ((f === 'startedAt' || f === 'finishedAt') && Number.isNaN(Date.parse(m[f]))) {
      out.push(`${f} не читается как время: ${m[f]}`);
    }
  }
  if (isFilled(m.startedAt) && isFilled(m.finishedAt) && Date.parse(m.finishedAt) < Date.parse(m.startedAt)) {
    out.push('finishedAt раньше startedAt');
  }
  if (m.mongodumpExitCode !== 0) out.push(`mongodumpExitCode ≠ 0: ${String(m.mongodumpExitCode)}`);
  if (!SHA256_RE.test(String(m.sha256))) out.push('sha256 не 64 шестнадцатеричных знака');
  if (!SHA256_SUBJECTS.includes(m.sha256Of)) {
    out.push(`sha256Of ∉ {${SHA256_SUBJECTS.join(', ')}}: ${String(m.sha256Of)}`);
  }
  if (!Number.isFinite(m.sizeBytes) || m.sizeBytes < minSizeBytes) {
    out.push(`sizeBytes ниже пола ${minSizeBytes}: ${String(m.sizeBytes)}`);
  }
  if (!INVENTORY_SOURCES.includes(m.inventorySource)) {
    out.push(`inventorySource ∉ {${INVENTORY_SOURCES.join(', ')}}: ${String(m.inventorySource)}`);
  }
  // Начатая и не дописанная коллекция — неполный дамп, что бы ни говорил код возврата.
  // Отдельная проверка, а не следствие пустой описи: неполнота бывает ЧАСТИЧНОЙ, и тогда
  // dbInventory непуст, exitCode нулевой, а копия — не копия.
  //
  // ГДЕ живёт гард — вопрос ФОРМЫ манифеста, ветка по schemaVersion (#1814, b3):
  // v1 — верхний уровень (история 09.08 остаётся валидной для ретенции как есть);
  // v2 — protocolChecks.incompleteCollections (гард протокола mongodump отделён от описи,
  // которая теперь берётся из содержимого артефакта, — источники не смешиваются).
  // Неизвестная версия уже отбракована выше — судить её форму по правилам v1 или v2 было
  // бы второй жалобой мимо предмета (ревью 10.08). Единое место гарда: только адрес поля
  // различается по версии, текст один.
  const incompleteAt =
    m.schemaVersion === 2
      ? [isPlainObject(m.protocolChecks) ? m.protocolChecks.incompleteCollections : undefined, 'protocolChecks.incompleteCollections']
      : m.schemaVersion === 1
        ? [m.incompleteCollections, 'incompleteCollections']
        : null;
  if (incompleteAt) {
    const [value, where] = incompleteAt;
    if (!Array.isArray(value)) out.push(`${where} не массив — неполнота не проверена`);
    else if (value.length > 0) out.push(`коллекции начаты и не дописаны: ${value.join(', ')}`);
  }
  if (m.schemaVersion === 2) {
    // Значение легально по закрытому списку, но у v2 законен только настоящий источник —
    // вторая жалоба на значение ВНЕ списка не плодится (его уже назвала проверка выше).
    if (m.inventorySource === 'mongodump-stderr') {
      out.push("inventorySource 'mongodump-stderr' у схемы v2 — возврат долга #1814 через чёрный ход");
    }
    if (m.incompleteCollections !== undefined) {
      out.push('incompleteCollections на верхнем уровне — поле схемы v1; у v2 гард живёт в protocolChecks');
    }
  }
  if (!Array.isArray(m.dbInventory) || m.dbInventory.length === 0) {
    out.push('dbInventory пуст — пустой дамп неотличим от полного');
  } else {
    const bad = m.dbInventory.findIndex(
      (e) => !isPlainObject(e) || !isFilled(e.db) || !isFilled(e.collection) || !Number.isFinite(e.documentCount),
    );
    if (bad !== -1) out.push(`dbInventory[${bad}] не несёт {db, collection, documentCount}`);
  }
  return out;
}

/** @param {unknown} m @param {{minSizeBytes?: number}} [opts] @returns {boolean} */
export function isFitForRetention(m, opts = {}) {
  return manifestProblems(m, opts).length === 0;
}

/**
 * План ретенции: что остаётся, что уходит и почему по каждому имени.
 *
 * Инварианты, которые обязаны держаться на любом входе (они же зубы):
 *   `keep ∪ drop = artifacts`, `keep ∩ drop = ∅`, у каждого имени ровно одна причина,
 *   и — пока существует хоть один пригодный артефакт — `keep` непуст.
 *
 * Последний инвариант это `kept:hard-floor`: даже если единственная целая копия старше окна,
 * она не удаляется. Ретенция, способная оставить ноль копий, — не политика хранения, а
 * отложенная потеря данных.
 *
 * Про пол сказано прямо, потому что зуб это поймал: при `DEFAULT_RETENTION_POLICY` он
 * НЕДОСТИЖИМ — `minCount: 7` удерживает свежайший артефакт раньше, чем очередь дойдёт до пола.
 * Пол существует не для штатного хода, а как страховка от политики: занулили уровни, сузили
 * окно, подставили чужой объект — ноль копий всё равно не получится. Ветку держит зуб с явно
 * заданной вырожденной политикой; выдавать её за обычный путь было бы украшением.
 *
 * @param {{now: string, artifacts: ReadonlyArray<{name: string, manifest?: unknown}>, policy?: object}} a
 * @returns {{keep: string[], drop: string[], reasons: Record<string, string>}}
 */
export function planRetention({ now, artifacts, policy = DEFAULT_RETENTION_POLICY }) {
  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) throw new TypeError(`now не читается как время: ${String(now)}`);
  if (!Array.isArray(artifacts)) throw new TypeError('artifacts не массив');
  if (!Array.isArray(policy?.tiers) || !Number.isFinite(policy?.hardCap)) {
    throw new TypeError('политика без tiers[] и hardCap — не политика');
  }
  // Противоречивая политика молча съедает уровни: hardCap срезает раньше, чем minCount успеет
  // удержать. Такое чинится в политике, а не в её исполнении, — значит падать надо здесь.
  const wantMost = Math.max(0, ...policy.tiers.map((t) => t.minCount ?? 0));
  if (policy.hardCap < wantMost) {
    throw new TypeError(`hardCap ${policy.hardCap} меньше minCount ${wantMost} — политика противоречит себе`);
  }

  const rows = artifacts.map((a) => {
    const parsed = parseArtifactName(a?.name);
    const problems = parsed.ok ? manifestProblems(a?.manifest, policy) : [parsed.problem];
    return { name: a?.name, fit: problems.length === 0, at: parsed.ok ? Date.parse(parsed.startedAt) : 0 };
  });

  const reasons = /** @type {Record<string, string>} */ ({});
  for (const r of rows.filter((r) => !r.fit)) reasons[r.name] = 'dropped:corrupt-manifest';

  // Новые первыми: и уровни, и hardCap считают «сколько свежих оставить», а не «каких».
  const fit = rows.filter((r) => r.fit).sort((x, y) => y.at - x.at || String(x.name).localeCompare(String(y.name)));

  fit.forEach((r, i) => {
    const ageHours = (nowMs - r.at) / HOUR_MS;
    const inWindow = policy.tiers.some((t) => ageHours <= t.maxAgeHours);
    const inCount = policy.tiers.some((t) => i < t.minCount);
    if (i >= policy.hardCap) reasons[r.name] = 'dropped:over-hard-cap';
    else if (inWindow) reasons[r.name] = 'kept:within-daily-window';
    else if (inCount) reasons[r.name] = 'kept:min-count';
    else reasons[r.name] = 'dropped:superseded-by-newer';
  });

  // Пол. Ставится ПОСЛЕ уровней: он их не отменяет, он лишь запрещает нулевой исход.
  if (fit.length > 0 && !fit.some((r) => reasons[r.name].startsWith('kept:'))) {
    reasons[fit[0].name] = 'kept:hard-floor';
  }

  const keep = rows.filter((r) => reasons[r.name].startsWith('kept:')).map((r) => r.name);
  const drop = rows.filter((r) => reasons[r.name].startsWith('dropped:')).map((r) => r.name);
  return { keep, drop, reasons };
}
