/**
 * `orphan-waiver` — именное освобождение пути от инварианта принадлежности.
 *
 * Канон: [`CONTRACT.md §5`](../../docs/meeting/workshop-wires/CONTRACT.md), комната M4,
 * плюс **условие 2 независимого аудита**, принятое председателем: у освобождения обязан
 * быть срок.
 *
 * ПОЧЕМУ СРОК НЕСУЩИЙ. В финальную форму вердикта `{ path, issuer, ref?, note? }` поле
 * `expiry` не попало, хотя предлагалось в диалоге. Без срока освобождение делается вечным
 * третьим бакетом: не дом, не неймспейс и не честный `orphan`, а «`orphan`, которому
 * разрешили быть им навсегда». Это второй выход из инварианта, открытый молча, — и он
 * дешевле парковки, значит станет нормой. Срок возвращает освобождению смысл отсрочки.
 *
 * ЧТО ЗДЕСЬ НЕ РЕШАЕТСЯ. Модуль не судит, ЗАСЛУЖЕННО ли освобождение: «уважительная причина»
 * машине не видна. Он проверяет форму, считает срок и оставляет след. Кто выдал и на что
 * сослался — видно поимённо, и это вся защита, которую механика даёт честно.
 */

/** Состояния освобождения. Список ЗАКРЫТ. */
export const WAIVER_STATES = Object.freeze({
  /** Действует: форма годна, срок не наступил. */
  ACTIVE: 'active',
  /** Срок прошёл — освобождение больше не освобождает. */
  EXPIRED: 'expired',
  /** Форма испорчена: не действует и НЕ считается просроченным. */
  INVALID: 'invalid',
});

/**
 * Предельный срок освобождения — 28 дней от выдачи.
 *
 * Число не с потолка: это окно, уже принятое §7 для разбора транскриптов, и держать в одном
 * контуре два разных «долгих окна» значит заводить спор о том, какое из них настоящее.
 * Срок дольше предела — не «щедрее», а ровно то бессрочное освобождение, против которого
 * условие 2 и выставлено; поэтому это дефект формы, а не предупреждение.
 */
export const MAX_WAIVER_DAYS = 28;

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO-8601 → epoch ms либо null. Детерминировано: `Date.parse`, не `Date.now`. */
function parseIso(v) {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Путь к сравнимому виду: слеши вперёд, без './' и хвостового слеша. */
function normalizePath(p) {
  return String(p ?? '').replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/+$/u, '');
}

/**
 * Проверка формы ОДНОГО освобождения.
 *
 * `issuer` обязателен и непуст: безымянное освобождение неотличимо от тихого прохода, а §5
 * запрещает тихий проход прямым текстом. `ref` и `note` остаются необязательными — вердикт
 * комнаты так и решил, и ужесточать его здесь было бы правкой контракта мимо комнаты.
 *
 * @returns {string[]} дефекты формы; пусто = форма годна
 */
export function validateWaiver(w) {
  const problems = [];
  if (normalizePath(w?.path) === '') problems.push('path пуст — освобождение привязано к пути');
  if (typeof w?.issuer !== 'string' || w.issuer.trim() === '') {
    problems.push('issuer пуст — безымянное освобождение неотличимо от тихого прохода');
  }
  const issued = parseIso(w?.issuedAt);
  if (issued === null) problems.push(`issuedAt=${String(w?.issuedAt)} не ISO-8601`);
  const expiry = parseIso(w?.expiry);
  if (expiry === null) {
    problems.push(`expiry=${w?.expiry === undefined ? '(нет)' : String(w.expiry)} не ISO-8601 — срок обязателен (условие 2 аудита)`);
  }
  if (issued !== null && expiry !== null) {
    if (expiry <= issued) problems.push('expiry не позже issuedAt — освобождение мертво в момент выдачи');
    else if (expiry - issued > MAX_WAIVER_DAYS * DAY_MS) {
      problems.push(`срок дольше предела ${MAX_WAIVER_DAYS} дней — это бессрочность окольным путём`);
    }
  }
  return problems;
}

/**
 * Состояние освобождения на момент `nowIso`.
 *
 * `now` приходит ПАРАМЕТРОМ, а не берётся из часов: зуб, зовущий `Date.now()` внутри,
 * менял бы вердикт от минуты прогона, и воспроизвести красный стало бы нечем.
 *
 * @returns {{state: string, problems: string[], daysLeft: number|null}}
 */
export function waiverState(w, nowIso) {
  const problems = validateWaiver(w);
  if (problems.length > 0) return { state: WAIVER_STATES.INVALID, problems, daysLeft: null };
  const now = parseIso(nowIso);
  if (now === null) {
    // Момент проверки не назван — это ошибка ЗОВУЩЕГО, и молча считать освобождение
    // действующим значит дать ему пройти по недосмотру.
    return { state: WAIVER_STATES.INVALID, problems: [`now=${String(nowIso)} не ISO-8601`], daysLeft: null };
  }
  const expiry = parseIso(w.expiry);
  if (expiry <= now) return { state: WAIVER_STATES.EXPIRED, problems: [], daysLeft: 0 };
  return { state: WAIVER_STATES.ACTIVE, problems: [], daysLeft: Math.ceil((expiry - now) / DAY_MS) };
}

/**
 * Разбор набора освобождений на действующие, просроченные и испорченные.
 *
 * Три группы НЕ схлопываются в «сколько действует»: просроченное освобождение — сигнал, что
 * отсрочка кончилась и путь пора парковать; испорченное — сигнал, что кто-то оформил его
 * неверно и, вероятно, считает себя защищённым. Молча выбросить обе группы значит потерять
 * оба сигнала и оставить автора в уверенности, что зуб его пропустит.
 *
 * Дубль пути — не ошибка формы, а дефект НАБОРА: два освобождения на один путь делают
 * непроверяемым вопрос «каким именно он освобождён» и чей срок считать.
 *
 * @returns {{active: object[], expired: object[], invalid: {waiver: object, problems: string[]}[], duplicates: string[]}}
 */
export function partitionWaivers(waivers, nowIso) {
  const active = [];
  const expired = [];
  const invalid = [];
  const seen = new Map();
  for (const w of waivers ?? []) {
    const { state, problems } = waiverState(w, nowIso);
    if (state === WAIVER_STATES.INVALID) invalid.push({ waiver: w, problems });
    else if (state === WAIVER_STATES.EXPIRED) expired.push(w);
    else {
      active.push(w);
      const p = normalizePath(w.path);
      seen.set(p, (seen.get(p) ?? 0) + 1);
    }
  }
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([p]) => p).sort();
  return { active, expired, invalid, duplicates };
}

/**
 * Множество путей, реально освобождённых на момент `nowIso` — вход `W` инварианта §5.
 *
 * Из ТРЁХ групп сюда попадает одна. Именно здесь срок начинает работать: просроченное
 * освобождение перестаёт быть входом инварианта, и путь возвращается в `O(t)` сам, без
 * ручной уборки и без чьего-либо решения.
 *
 * @returns {Set<string>}
 */
export function activeWaiverPaths(waivers, nowIso) {
  return new Set(partitionWaivers(waivers, nowIso).active.map((w) => normalizePath(w.path)));
}

/**
 * Строка следа для вывода зуба. §5: освобождение обязано оставлять след, тихий проход запрещён.
 *
 * Печатается ВСЕГДА, в том числе когда действующих ноль — иначе отсутствие строки читается
 * как «освобождений не было», хотя может значить «все просрочены» или «все испорчены».
 */
export function renderWaiverLine(part) {
  const bits = [`освобождений действует ${part.active.length}`];
  if (part.expired.length > 0) bits.push(`просрочено ${part.expired.length} — отсрочка кончилась, пора парковать`);
  if (part.invalid.length > 0) bits.push(`испорчено ${part.invalid.length} — НЕ освобождают, автор мог считать иначе`);
  if (part.duplicates.length > 0) bits.push(`дубль пути: ${part.duplicates.join(', ')}`);
  return bits.join(' · ');
}
