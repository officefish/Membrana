/**
 * `belongs` — предикат принадлежности инструмента: дом, неймспейс или сирота.
 *
 * Канон: [`CONTRACT.md §1`](../../docs/meeting/workshop-wires/CONTRACT.md) (комната M1) и
 * **§2** (комната M8, тест как спутник предмета), заседание `workshop-wires`, закрыто 30.07.
 *
 * ТРИ ИСХОДА, СПИСОК ЗАКРЫТ. `orphan` — честный третий исход, а не позор и не ошибка: он
 * означает «правила или дома для этого носителя ещё нет». Четвёртого исхода у предиката нет
 * и не заводится — всё, что не решается тремя, есть ошибка входа (см. `checkRegistry`).
 *
 * ЯДРО НЕ ХОДИТ В ФС И НЕ ЧИТАЕТ РЕЕСТР. Дома, записи неймспейсов и проверка существования
 * файла приходят параметрами. Причина не в чистоте ради чистоты: §2 определяет предмет теста
 * через «первый СУЩЕСТВУЮЩИЙ файл» из двух локусов, и зуб, читающий настоящее дерево, менял
 * бы вердикт от состояния рабочей копии. Инъекция делает вердикт воспроизводимым.
 */

/** Разрешённые виды правила членства неймспейса (§1, список закрыт). */
export const MEMBERSHIP_KINDS = Object.freeze(['pathPrefix', 'namePrefix', 'pathGlob', 'explicitList']);

/**
 * Причины исхода `orphan`. Названы, а не оставлены пустыми: «сирота» без причины неотличима
 * от «предикат не справился», и первый же отчёт прибора превратился бы в непроверяемый список.
 */
export const ORPHAN_REASONS = Object.freeze({
  /** Ни дом, ни одно правило членства не совпало — носитель просто не припаркован. */
  NO_RULE: 'no_rule',
  /** §2: файл — тест, но предмет не разрешён ни одним из двух локусов. */
  SUBJECT_UNRESOLVED: 'subject_unresolved',
});

/**
 * Имена, запрещённые §1 как `id` неймспейса: свалка под видом правила.
 * Запрет содержательный — «всё сиротское» перестаёт быть видимым как сиротское.
 */
export const BANNED_NAMESPACE_IDS = Object.freeze(['misc', 'other', 'tmp', 'misc-scripts', 'orphans']);

/** `id` неймспейса (§1). */
const NAMESPACE_ID_RE = /^[a-z][a-z0-9-]*$/u;

/** Поля дома, запрещённые в записи неймспейса (§1): неймспейс не обязан глаголами. */
const HOME_ONLY_FIELDS = Object.freeze(['verbs', 'worksOn', 'kit', 'roots']);

/** Путь к сравнимому виду: слеши вперёд, без './' и хвостового слеша. */
export function normalizePath(p) {
  return String(p ?? '')
    .replaceAll('\\', '/')
    .replace(/^\.\//u, '')
    .replace(/\/+$/u, '');
}

/** Лежит ли `p` внутри каталога `dir` (или равен ему). Сравнение по сегментам, не по подстроке. */
function underDir(p, dir) {
  if (dir === '') return true;
  return p === dir || p.startsWith(`${dir}/`);
}

/** Является ли файл тестом-спутником (§2). */
export function isTest(p) {
  return normalizePath(p).endsWith('.test.mjs');
}

/**
 * Предмет теста (§2). Список локусов ЗАКРЫТ — расширение только отдельным вердиктом.
 *
 * Тело теста и import-граф не читаются: §2 запрещает прямо. Правило нарочно грубое и
 * проверяемое глазом — 33 случая «инструмент припаркован, тест нет» закрываются им сами,
 * без единой строки ручной парковки.
 *
 * @param {string} testPath
 * @param {(p: string) => boolean} exists
 * @returns {string|null} путь предмета либо null
 */
export function subjectOf(testPath, exists) {
  const t = normalizePath(testPath);
  if (!isTest(t)) return null;
  const slash = t.lastIndexOf('/');
  const dir = slash === -1 ? '' : t.slice(0, slash);
  const stem = t.slice(slash + 1).slice(0, -'.test.mjs'.length);
  const loci = [dir === '' ? `${stem}.mjs` : `${dir}/${stem}.mjs`, `scripts/lib/${stem}.mjs`];
  for (const locus of loci) {
    if (exists(locus)) return locus;
  }
  return null;
}

/**
 * Glob → регексп. Поддержаны `**`, `*`, `?` — ровно то, что употребимо в `membership.pathGlob`.
 *
 * ЧЕСТНЫЙ ПРЕДЕЛ: фигурные группы `{a,b}` и extglob НЕ поддержаны. Не «пока»: правило членства
 * читается человеком-держателем, и чем оно выразительнее, тем труднее спорить о его границе.
 * Непонятый синтаксис даёт НЕсовпадение, а не исключение — иначе один кривой glob в реестре
 * ронял бы весь прогон прибора.
 */
function globToRe(glob) {
  let out = '^';
  const g = normalizePath(glob);
  for (let i = 0; i < g.length; i += 1) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        // `**/` съедает и ноль сегментов: `docs/**/x` обязан ловить `docs/x`.
        if (g[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
      } else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/u, '\\$&');
  }
  return new RegExp(`${out}$`, 'u');
}

/** Совпадает ли путь с правилом членства записи. */
function membershipMatches(membership, p) {
  const { kind, value } = membership ?? {};
  if (!MEMBERSHIP_KINDS.includes(kind)) return false;
  if (kind === 'pathPrefix') return underDir(p, normalizePath(value));
  if (kind === 'namePrefix') {
    const name = p.slice(p.lastIndexOf('/') + 1);
    return name.startsWith(String(value ?? ''));
  }
  if (kind === 'pathGlob') return globToRe(String(value ?? '')).test(p);
  return Array.isArray(value) && value.map(normalizePath).includes(p);
}

/**
 * Проверка ОДНОЙ записи реестра неймспейсов (§1).
 * @returns {string[]} список дефектов; пусто = запись годна
 */
export function validateNamespace(rec) {
  const problems = [];
  const id = rec?.id;
  if (typeof id !== 'string' || !NAMESPACE_ID_RE.test(id)) {
    problems.push(`id=${String(id)} не соответствует [a-z][a-z0-9-]*`);
  } else if (BANNED_NAMESPACE_IDS.includes(id)) {
    problems.push(`id=${id} — свалка под видом правила: §1 запрещает «всё сиротское» именем`);
  }
  if (typeof rec?.title !== 'string' || rec.title.trim() === '') problems.push('title пуст');

  // Держатель — `persona` XOR `ownerRef`. Ровно XOR: и пустой, и двойной держатель делают
  // запись невалидной. Два держателя — это «отвечают оба», то есть не отвечает никто.
  const hasPersona = typeof rec?.holder?.persona === 'string' && rec.holder.persona.trim() !== '';
  const hasOwnerRef = typeof rec?.holder?.ownerRef === 'string' && rec.holder.ownerRef.trim() !== '';
  if (hasPersona === hasOwnerRef) {
    problems.push(hasPersona ? 'holder несёт и persona, и ownerRef — XOR нарушен' : 'holder пуст — запись невалидна');
  }

  if (!MEMBERSHIP_KINDS.includes(rec?.membership?.kind)) {
    problems.push(`membership.kind=${String(rec?.membership?.kind)} вне закрытого списка четырёх`);
  }
  if (rec?.containerKind !== undefined && rec.containerKind !== 'plain' && rec.containerKind !== 'bidi') {
    problems.push(`containerKind=${String(rec.containerKind)} вне {plain, bidi}`);
  }
  for (const f of HOME_ONLY_FIELDS) {
    if (rec?.[f] !== undefined) problems.push(`поле ${f} — признак дома, в неймспейсе запрещено`);
  }
  return problems;
}

/**
 * Проверка реестра ЦЕЛИКОМ: записи по отдельности плюс конфликт `explicitList`.
 *
 * Конфликт `explicitList` (один путь перечислен двумя записями) §1 велит разрешать **отказом
 * проверки реестра**, а не выбором победителя. Поэтому он живёт здесь, а не в `belongs`:
 * четвёртым исходом предиката он был бы расширением закрытого списка трёх, а отказом реестра
 * он есть то, чем является — испорченный вход, на котором вердиктов не бывает.
 *
 * @returns {{ok: boolean, problems: string[]}}
 */
export function checkRegistry(namespaces) {
  const problems = [];
  const seenIds = new Set();
  /** @type {Map<string, string[]>} */
  const explicit = new Map();
  for (const rec of namespaces ?? []) {
    for (const p of validateNamespace(rec)) problems.push(`${rec?.id ?? '(без id)'}: ${p}`);
    if (typeof rec?.id === 'string') {
      if (seenIds.has(rec.id)) problems.push(`${rec.id}: id не уникален в реестре`);
      seenIds.add(rec.id);
    }
    if (rec?.membership?.kind === 'explicitList' && Array.isArray(rec.membership.value)) {
      for (const raw of rec.membership.value) {
        const p = normalizePath(raw);
        explicit.set(p, [...(explicit.get(p) ?? []), rec.id]);
      }
    }
  }
  for (const [p, ids] of explicit) {
    if (ids.length > 1) problems.push(`${p}: перечислен в explicitList сразу у ${ids.join(', ')} — проверка реестра отказана`);
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Принадлежность носителя.
 *
 * Порядок разрешения — из §1 и не переставляется: **сначала дом**, иначе неймспейс, иначе
 * сирота. Дом сильнее правила потому, что дом отвечает глаголами, а неймспейс — только
 * смыслом правила; при обратном порядке инструмент внутри дома мог бы утечь в чужой
 * неймспейс по совпадению префикса имени.
 *
 * Тест разрешается ветвью §2 **до** всего остального: у него нет собственной принадлежности,
 * он наследует предметную. Ветвь, а не второй механизм — рекурсия сюда же, одним предикатом.
 *
 * @param {string} path носитель, путь от корня репозитория
 * @param {{homes?: readonly string[], namespaces?: readonly object[], exists?: (p:string)=>boolean}} ctx
 * @returns {{kind:'home',id:string}|{kind:'namespace',id:string}|{kind:'orphan',reason:string}}
 */
export function belongs(path, ctx = {}) {
  const { homes = [], namespaces = [], exists = () => false } = ctx;
  const p = normalizePath(path);

  if (isTest(p)) {
    const subject = subjectOf(p, exists);
    if (subject === null) return { kind: 'orphan', reason: ORPHAN_REASONS.SUBJECT_UNRESOLVED };
    return belongs(subject, ctx);
  }

  // Дом: длиннейший совпавший корень. Вложенные дома существуют (docs/tasks и
  // docs/audit/tasks — соседи, но docs/audit/* лежит под docs/audit), и «первый попавшийся»
  // отдал бы носитель внешнему дому, у которого нет глаголов для этого предмета.
  let home = null;
  for (const raw of homes) {
    const h = normalizePath(raw);
    if (underDir(p, h) && (home === null || h.length > home.length)) home = h;
  }
  if (home !== null) return { kind: 'home', id: home };

  const matched = (namespaces ?? []).filter((rec) => membershipMatches(rec?.membership, p));
  if (matched.length === 1) return { kind: 'namespace', id: matched[0].id };
  if (matched.length > 1) {
    // §1: конфликт разрешается длиннейшим pathPrefix, иначе минимальным id. Второй ключ —
    // не «на всякий случай»: без него порядок записей в файле реестра менял бы вердикт.
    const lenOf = (rec) => (rec?.membership?.kind === 'pathPrefix' ? normalizePath(rec.membership.value).length : -1);
    const best = [...matched].sort((a, b) => lenOf(b) - lenOf(a) || String(a.id).localeCompare(String(b.id)))[0];
    return { kind: 'namespace', id: best.id };
  }

  return { kind: 'orphan', reason: ORPHAN_REASONS.NO_RULE };
}
