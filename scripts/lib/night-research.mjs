/**
 * night-research — ночной ресёрч-контур (эпик #592, S6). Слой ПОВЕРХ night-hunt, не
 * переписывающий его.
 *
 * Решение владельца #2: ночь = 100% `derived` — сны системы из ПАР кристаллов. Дикого
 * слота нет, внешнее приходит утром само. Q4b: pickTopic детерминирован; артефакт
 * docs/research/night/<date>-<slug>.md с фронтматтером {topic, mode, origin, status,
 * ttl}; `adopted` ставится ТОЛЬКО обратной ссылкой из реестра/инсайта (владельческий
 * гейт), не самим контуром. Метрика nightYield = adopted/(adopted+void) за 14 дней.
 *
 * «Сон» = пара кристаллов-сиблингов (общий родитель — два вывода из одного корня).
 * Вопрос звучит «наш X — правда или бред» и допускает честное «нет» (void). Перед
 * Perplexity вопрос проходит neutralizeJargon → externalizeQuery: жаргон отклоняется
 * ВИДИМО (status=rejected), а не уходит мусором.
 */
import { neutralizeJargon, externalizeQuery, parseMs } from './strategy-horizon.mjs';

/** Активные кристаллы (не revoked/broken). */
function activeTokens(registry) {
  const list = Array.isArray(registry?.tokens) ? registry.tokens : [];
  return list.filter((t) => t && t.status !== 'revoked' && t.status !== 'broken');
}

/**
 * Детерминированный перечень пар-снов: неупорядоченные пары DERIVED кристаллов, делящих
 * хотя бы одного родителя (сиблинги). Стабильная сортировка по (idA, idB) — порядок не
 * зависит от порядка в реестре.
 *
 * @param {any} registry
 * @returns {{a: any, b: any, sharedParents: string[], key: string}[]}
 */
export function enumeratePairs(registry) {
  const derived = activeTokens(registry)
    .filter((t) => t.class === 'derived' && Array.isArray(t.parents) && t.parents.length > 0)
    .slice()
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const pairs = [];
  for (let i = 0; i < derived.length; i += 1) {
    for (let j = i + 1; j < derived.length; j += 1) {
      const shared = derived[i].parents.filter((p) => derived[j].parents.includes(p));
      if (shared.length > 0) {
        pairs.push({
          a: derived[i],
          b: derived[j],
          sharedParents: shared.slice().sort(),
          key: `${derived[i].id}__${derived[j].id}`,
        });
      }
    }
  }
  return pairs.sort((p, q) => (p.key < q.key ? -1 : p.key > q.key ? 1 : 0));
}

/** FNV-1a хеш строки → неотрицательное целое (детерминированная ротация по seed-дате). */
function seedHash(seed) {
  const text = String(seed ?? '');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Короткая выжимка claim без хвостовой пунктуации — для вопроса-сна. */
function shortClaim(claim, max = 90) {
  const t = String(claim ?? '').replace(/\s+/gu, ' ').trim().replace(/[.…]+$/u, '');
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
}

/**
 * Построить вопрос-сон из пары и прогнать через neutralizeJargon → externalizeQuery.
 * Возвращает и «сырой» вопрос (для нас), и внешний результат (для Perplexity/статуса).
 *
 * @param {{a: any, b: any}} pair
 * @param {{internalNames?: readonly string[]}} [opts] словарь имён репозитория (#599)
 * @returns {{raw: string, external: ReturnType<typeof externalizeQuery>}}
 */
export function buildDreamQuery(pair, opts = {}) {
  const raw =
    `Наш вывод «${shortClaim(pair.a.claim)}» в сочетании с «${shortClaim(pair.b.claim)}» — ` +
    `правда или бред? Что говорит внешняя практика 2025–2026?`;
  const external = externalizeQuery(neutralizeJargon(raw), { internalNames: opts.internalNames ?? [] });
  return { raw, external };
}

/**
 * Детерминированно выбрать тему ночи (Q4b). seed (обычно дата) вращает выбор пары так,
 * что разные ночи берут разные пары, но при одном seed выбор воспроизводим.
 *
 * @param {any} registry
 * @param {{seed: string}} opts
 * @returns {null | {slug: string, topic: string, mode: 'derived', origin: string, query: string, rejected: boolean, rejectReason: string|null, pairKey: string, sharedParents: string[]}}
 */
export function pickTopic(registry, opts) {
  const pairs = enumeratePairs(registry);
  if (pairs.length === 0) return null;
  const idx = seedHash(opts?.seed) % pairs.length;
  const pair = pairs[idx];
  const { raw, external } = buildDreamQuery(pair, { internalNames: opts?.internalNames ?? [] });
  return {
    slug: pair.key.slice(0, 80),
    topic: `${shortClaim(pair.a.claim, 40)} × ${shortClaim(pair.b.claim, 40)}`,
    mode: 'derived',
    origin: `pair:${pair.a.id}+${pair.b.id}`,
    query: external.ok ? external.query : raw,
    rejected: !external.ok,
    rejectReason: external.ok ? null : external.reason,
    pairKey: pair.key,
    sharedParents: pair.sharedParents,
  };
}

/**
 * Эффективный статус сна с учётом срока: `pending`, переживший свой TTL, — это `void`.
 *
 * ЗАЧЕМ (#598). `void` был объявлен в контракте статусов, но не писался никем: артефакт
 * рождался `pending` и оставался им навсегда, потому что запрос наружу не уходил.
 * «Честное нет» было недостижимо, а `nightYield` считал знаменателем `adopted + void`
 * — то есть фактически `adopted`, и метрика не умела показать провал.
 *
 * Переход по сроку, а не по факту ответа: ночь не обязана знать, придёт ли ответ, но
 * обязана перестать врать, что вопрос ещё «в работе», когда срок истёк. Это тот же
 * honest-timeout, что и `orphan` для слота `consumed` в вердикте F1/M4.
 *
 * `checked` сроком не трогаем: проверка уже была, ждёт владельческого `adopted`.
 *
 * @param {{status?: string|null, date?: string|null, ttl?: number|string|null}} artifact
 * @param {number} nowMs
 * @returns {string|null}
 */
export function effectiveStatus(artifact, nowMs) {
  const status = artifact?.status ?? null;
  if (status !== 'pending') return status; // checked/adopted/rejected/void — не переписываем
  const ms = parseMs(artifact?.date);
  if (ms == null) return status; // без даты срок не вычислим — не выдумываем
  const ttlDays = Number(artifact?.ttl ?? 14);
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) return status;
  return nowMs - ms > ttlDays * 24 * 60 * 60 * 1000 ? 'void' : status;
}

/**
 * Классифицировать ответ Perplexity: находка → `checked`, честное «снаружи пусто» → `void`.
 * Эвристика совпадает с `looksUnanswered` из deep-research (#402 / #516): лучше ложное
 * void, чем pending с мусором, выданным за проверку.
 *
 * @param {string|null|undefined} answer
 * @returns {{status: 'checked'|'void', reason: string|null}}
 */
export function classifyDreamAnswer(answer) {
  const text = String(answer ?? '').trim();
  if (text.length === 0) {
    return { status: 'void', reason: 'пустой ответ Perplexity' };
  }
  const lower = text.toLowerCase();
  const markers = [
    'не содержат информации',
    'не содержит информации',
    'не найдено',
    'не относятся к',
    'ошибка в названии',
    'no information',
    'not found',
    'could not find',
    'no relevant',
  ];
  const hit = markers.find((m) => lower.includes(m));
  if (hit) {
    return { status: 'void', reason: `поиск не нашёл тему («${hit}»)` };
  }
  return { status: 'checked', reason: null };
}

/**
 * Фронтматтер артефакта ночного ресёрча (Q4b: {topic, mode, origin, status, ttl}).
 * status ∈ {pending, checked, void, adopted, rejected}; adopted проставляется ТОЛЬКО
 * обратной ссылкой владельца, не здесь. rejected — если вопрос не прошёл externalizeQuery.
 *
 * @param {ReturnType<typeof pickTopic>} topic
 * @param {{date: string, ttlDays?: number}} meta
 * @param {{status?: 'pending'|'checked'|'void', body?: string}|null} [check]
 * @returns {string}
 */
export function renderNightArtifact(topic, meta, check = null) {
  let status = 'pending';
  if (topic.rejected) status = 'rejected';
  else if (check?.status === 'checked' || check?.status === 'void' || check?.status === 'pending') {
    status = check.status;
  }
  const ttl = meta?.ttlDays ?? 14;
  const resultBody =
    check?.body ??
    '_(заполняется после внешнего поиска; честное «нет» = `status: void`)_';
  const adoptedNote =
    status === 'checked'
      ? '> `adopted` проставляется ТОЛЬКО обратной ссылкой из реестра задач или инсайта\n> (владельческий гейт), не этим контуром. Сейчас `status: checked` — проверено, находка есть, ждёт владельческого решения о принятии.'
      : '> `adopted` проставляется ТОЛЬКО обратной ссылкой из реестра задач или инсайта\n> (владельческий гейт), не этим контуром.';
  const fm = [
    '---',
    `topic: "${String(topic.topic).replace(/"/gu, "'")}"`,
    `mode: ${topic.mode}`,
    `origin: ${topic.origin}`,
    `status: ${status}`,
    `ttl: ${ttl}`,
    `date: ${meta.date}`,
    '---',
    '',
    `# Сон системы: ${topic.topic}`,
    '',
    `**Пара кристаллов:** \`${topic.pairKey}\``,
    `**Общий корень:** ${topic.sharedParents.map((p) => `\`${p}\``).join(', ')}`,
    '',
    '## Вопрос к внешней практике',
    '',
    topic.rejected
      ? `> ⚠️ ОТКЛОНЁН externalizeQuery: ${topic.rejectReason}\n>\n> Вопрос не ушёл наружу — виден как \`status: rejected\`, а не тихий сбой.`
      : topic.query,
    '',
    '## Результат проверки сна',
    '',
    resultBody,
    '',
    adoptedNote,
  ];
  return fm.join('\n');
}

/**
 * nightYield = adopted / (adopted + void) за окно (Q4b). Считает по фронтматтерам
 * артефактов ночного ресёрча. pending/checked/rejected в знаменатель НЕ входят (ещё не
 * разрешены владельцем / не провалились). Пустой знаменатель → null (метрики нет, не 0/0).
 *
 * @param {readonly {status?: string, date?: string}[]} artifacts
 * @param {{now: string|number, windowDays?: number}} opts
 * @returns {{yield: number|null, adopted: number, void: number, window: number}}
 */
export function nightYield(artifacts, opts) {
  const nowMs = parseMs(opts?.now);
  if (nowMs == null) throw new Error('nightYield: opts.now обязателен');
  const windowDays = opts?.windowDays ?? 14;
  const floorMs = nowMs - windowDays * 24 * 60 * 60 * 1000;
  let adopted = 0;
  let voided = 0;
  for (const a of artifacts ?? []) {
    const ms = parseMs(a?.date);
    if (ms == null || ms < floorMs || ms > nowMs) continue;
    // Считаем ЭФФЕКТИВНЫЙ статус: пока просроченный pending не считался void, знаменатель
    // равнялся adopted, и метрика структурно могла показать только 100% либо «нет данных»
    // — сообщить о провале ночи она была неспособна (#598, находка аудита 18.07).
    const status = effectiveStatus(a, nowMs);
    if (status === 'adopted') adopted += 1;
    else if (status === 'void') voided += 1;
  }
  const denom = adopted + voided;
  return { yield: denom === 0 ? null : adopted / denom, adopted, void: voided, window: windowDays };
}
