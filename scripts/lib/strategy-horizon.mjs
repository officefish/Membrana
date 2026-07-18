/**
 * strategy-horizon — чистое ядро генератора стратегии дня (эпик #592, S1–S3).
 *
 * Спека: docs/prompts/STRATEGY_DAY_GENERATOR_PROMPT.md. Пять вердиктов консилиума
 * 17.07 (Q1, Q2, Q3, Q4b, Q5) сведены к нескольким чистым функциям без сети:
 *
 *   S1  collectHorizonInputs(horizon, {insights, research}, opts) → {highlights[], provenance[]}
 *       Один читатель обоих каналов (Q5). Всё вливается ТОЛЬКО как `highlight` — ни у
 *       одного канала нет права на `assign` (Q1: стратегия описывает акцент, не меняет
 *       мир). Эхо схлопывается дедупом по origin-hash — БЕЗ спецкода, переиспользуя
 *       `dedupeByOrigin` из truth-graph. Отсутствующий канал даёт ВИДИМУЮ пометку в
 *       provenance, а не `null` и молчание (регресс двух месяцев, решение владельца #3).
 *
 *   S2  makeHorizon / horizonSince — горизонт есть {gate, phase, criteria[]}, меряется
 *       ВЕХОЙ, не датой (Q2). Инвариант d/dt = 0: тождество горизонта не содержит
 *       календарной даты, поэтому смена дня его не двигает — только прохождение gate.
 *       since = max(lastGateTransition, now − N) (Q3): календарный nextDay вырезан.
 *
 *   S3  isTimely(insight, horizon, gitLog) — своевременность = ВЕХА БЛИЗКО **И** ОБЛАСТЬ
 *       МОЛЧИТ N дней (решение владельца #1). Две конъюнкции буквально повторяют замысел:
 *       «ведут к долгосрочным целям» (веха) и «поднимаются над рутиной» (молчит).
 *
 *   externalizeQuery(q) → q' — «проверка сна на реальность» (Q5). Внутренний жаргон
 *       (ADR, имя пакета, #issue, id кристалла) не имеет смысла для внешнего поиска →
 *       ЯВНЫЙ отказ с читаемым сообщением, а не тихая отправка мусора в Perplexity.
 *
 * Функции детерминированы и не ходят в сеть: время подаётся параметром `now`, git —
 * данными `gitLog`. Это позволяет весь тест гонять офлайн (DoD).
 */

import { dedupeByOrigin, originHash } from './truth-graph.mjs';

/** Допустимые фазы горизонта (Q2). Меряется вехой, не датой. */
export const HORIZON_PHASES = Object.freeze(['approaching', 'mid', 'gate-ready']);

/** Окно тишины по умолчанию для isTimely (S3): область молчит столько дней. */
export const DEFAULT_SILENCE_DAYS = 5;

/** Окно «свежести» по умолчанию, если у горизонта нет lastGateTransition (S1). */
export const DEFAULT_STALE_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Разобрать ISO-дату в миллисекунды. Возвращает `null` на пустом/битом входе —
 * чтобы вызывающий мог отличить «нет даты» от эпохи 0.
 *
 * @param {string | number | null | undefined} value
 * @returns {number | null}
 */
export function parseMs(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const ms = Date.parse(String(value));
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Собрать горизонт (Q2/S2). Валидирует фазу по перечислению — неизвестная фаза это
 * ЯВНЫЙ FAIL, а не молчаливое проглатывание. Возвращает замороженный объект: тождество
 * горизонта = {gate, phase, criteria[]}, БЕЗ календарной даты. `lastGateTransition` —
 * веха последнего прохождения gate (метаданные для окна since), не часть тождества.
 *
 * Инвариант d/dt = 0: makeHorizon не читает текущее время, поэтому два вызова с одним
 * входом в разные календарные дни дают идентичный (deep-equal) горизонт.
 *
 * @param {{gate: string, phase: string, criteria?: string[], lastGateTransition?: string}} input
 * @returns {Readonly<{gate: string, phase: string, criteria: string[], lastGateTransition: string|null}>}
 */
export function makeHorizon(input) {
  const gate = String(input?.gate ?? '').trim();
  if (gate === '') {
    throw new Error('makeHorizon: gate обязателен — горизонт меряется вехой, не датой');
  }
  const phase = String(input?.phase ?? '').trim();
  if (!HORIZON_PHASES.includes(phase)) {
    throw new Error(
      `makeHorizon: неизвестная фаза «${phase || '(пусто)'}» — допустимо ${HORIZON_PHASES.join(' | ')}`,
    );
  }
  const criteria = Array.isArray(input?.criteria)
    ? input.criteria.map((c) => String(c)).filter((c) => c.trim() !== '')
    : [];
  const lastGateTransition = input?.lastGateTransition
    ? String(input.lastGateTransition)
    : null;
  return Object.freeze({ gate, phase, criteria: Object.freeze(criteria), lastGateTransition });
}

/**
 * Нижняя граница окна (Q3): since = max(lastGateTransition, now − windowDays).
 * Календарный nextDay — анти-паттерн, вырезан: окно привязано к ВЕХЕ, а N дней —
 * лишь потолок, если веха далеко или её нет.
 *
 * @param {{lastGateTransition?: string|null}} horizon
 * @param {string|number} now  текущий момент (ISO или ms) — подаётся, не читается из часов
 * @param {number} [windowDays]
 * @returns {number} миллисекунды нижней границы
 */
export function horizonSince(horizon, now, windowDays = DEFAULT_STALE_WINDOW_DAYS) {
  const nowMs = parseMs(now);
  if (nowMs == null) {
    throw new Error('horizonSince: now обязателен и должен быть валидной датой/ms');
  }
  const floorByWindow = nowMs - windowDays * DAY_MS;
  const veha = parseMs(horizon?.lastGateTransition);
  return veha == null ? floorByWindow : Math.max(veha, floorByWindow);
}

/**
 * Внутренние идентификаторы, не имеющие смысла для внешнего поиска. Каждый — повод
 * ОТКЛОНИТЬ вопрос: перед Perplexity его надо переформулировать в мирочитаемый.
 */
/**
 * Аббревиатуры, законные во ВНЕШНЕМ вопросе, хотя по форме неотличимые от метки
 * повестки (буквы+цифра). Без этого списка правило «метка заседания» отклонило бы
 * `MP3`/`H264` — а для проекта про звук это ровно те слова, ради которых сон и
 * задаётся. Ошибка здесь дорогая в обе стороны, поэтому исключения названы поимённо.
 */
const EXTERNAL_ACRONYMS = new Set(['MP3', 'MP4', 'MP2', 'H264', 'H265', 'G711', 'G722', 'AAC3', 'PS4', 'PS5']);

const INTERNAL_JARGON = [
  { re: /\bADR[-\s]?\d+\b/iu, what: 'ссылка на ADR' },
  { re: /\bADR\b/u, what: 'аббревиатура ADR' },
  { re: /@membrana\/[a-z0-9-]+/iu, what: 'имя внутреннего пакета' },
  { re: /(?:^|\s)#\d+\b/u, what: 'номер issue/PR' },
  { re: /\b\w+-\d{2}-\d{2}-\w[\w-]*\b/u, what: 'id кристалла/сессии с датой' },
  { re: /\b[A-Za-z_]+\.(?:mjs|ts|tsx|js|json|md)\b/u, what: 'путь к файлу репозитория' },
  // #599: три класса, которые утекли наружу 18.07 (Perplexity вернул ЕГРЮЛ на вопрос
  // с внутренним жаргоном). Аудит дня 18.07 подтвердил утечку живым прогоном:
  // externalizeQuery('MAIN_DAY_ISSUE') возвращал ok=true.
  { re: /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u, what: 'имя документа/константы (CAPS_SNAKE)' },
  { re: /\b[a-z][a-z0-9-]*:[a-z][a-z0-9-]*\b/u, what: 'имя yarn-скрипта/ритуала' },
  { re: /\b[A-Z]{1,2}\d{1,2}′?\b/u, what: 'метка вопроса повестки/вердикта' },
];
// ЗАМЕЧЕНО: голый внутренний слаг без даты (`graph-first-step-572`) НЕ детектируется —
// он неотличим от обычных слов. Ночной контур (S6) обязан внешним делать текст ПОСЫЛКИ
// кристалла, а не его id; на id externalizeQuery не полагается.

/**
 * «Проверка сна на реальность» (Q5): подготовить вопрос к внешнему поиску. Внутренний
 * жаргон не переводится автоматически — он ОТКЛОНЯЕТСЯ с читаемым сообщением, чтобы
 * отклонённый вопрос был видимым состоянием, а не тихой отправкой мусора в Perplexity.
 *
 * @param {string} query
 * @returns {{ok: true, query: string} | {ok: false, reason: string, offending: string[]}}
 */
export function externalizeQuery(query, { internalNames = [] } = {}) {
  const text = String(query ?? '').trim();
  if (text === '') {
    return { ok: false, reason: 'externalizeQuery: пустой вопрос — нечего проверять сном', offending: [] };
  }
  /** @type {string[]} */
  const offending = [];

  // Имена скриптов репозитория (`main-day-issue`) по форме неотличимы от законных
  // английских связок `end-to-end`, `state-of-the-art`, `signal-to-noise` — правило
  // «kebab из N сегментов» отклоняло бы их и убивало нормальные внешние вопросы.
  // Поэтому список не угадывается по форме, а приходит СЛОВАРЁМ от вызывающего.
  for (const name of internalNames) {
    const n = String(name ?? '').trim();
    if (n.length < 3) continue;
    const re = new RegExp(`(?<![\\w-])${n.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?![\\w-])`, 'iu');
    if (re.test(text)) offending.push(`имя скрипта/документа репозитория: «${n}»`);
  }
  for (const { re, what } of INTERNAL_JARGON) {
    const m = text.match(re);
    if (!m) continue;
    // Законная внешняя аббревиатура по форме совпала с меткой повестки — не жаргон.
    if (EXTERNAL_ACRONYMS.has(m[0].trim().toUpperCase())) continue;
    offending.push(`${what}: «${m[0].trim()}»`);
  }
  if (offending.length > 0) {
    return {
      ok: false,
      reason:
        `externalizeQuery: вопрос содержит внутренний жаргон и не годится для внешнего поиска — ` +
        offending.join('; '),
      offending,
    };
  }
  return { ok: true, query: text };
}

/**
 * Заглушить внутренний жаргон перед внешним поиском: ADR/имя пакета/#issue/путь/id с
 * датой заменяются нейтральным «…». Это «перевод сна на язык мира» (Q5) — лёгкая
 * externalize ДО жёсткого гварда externalizeQuery. Что заглушить не удалось (жаргон без
 * шаблона) — поймает гвард и отклонит видимо.
 *
 * @param {string} text
 * @returns {string}
 */
export function neutralizeJargon(text) {
  let out = String(text ?? '');
  for (const { re } of INTERNAL_JARGON) {
    out = out.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`), '…');
  }
  return out.replace(/…(?:\s*…)+/gu, '…').replace(/\s{2,}/gu, ' ').trim();
}

/**
 * Затрагивает ли набор путей область инсайта. Область — префикс пути (`insight.area`)
 * либо, в его отсутствие, эвристика по тегам (совпадение тега с сегментом пути).
 *
 * @param {readonly string[]} files
 * @param {{area?: string, tags?: string[]}} insight
 * @returns {boolean}
 */
export function touchesArea(files, insight) {
  const list = (files ?? []).map((f) => String(f).replace(/\\/gu, '/'));
  const area = String(insight?.area ?? '').trim().replace(/\\/gu, '/');
  if (area !== '') {
    return list.some((f) => f === area || f.startsWith(area.endsWith('/') ? area : `${area}/`));
  }
  const tags = (insight?.tags ?? []).map((t) => String(t).toLowerCase()).filter(Boolean);
  if (tags.length === 0) return false;
  return list.some((f) => {
    const segs = f.toLowerCase().split('/');
    return tags.some((t) => segs.includes(t));
  });
}

/**
 * Своевременность инсайта (S3, решение владельца #1): ВЕХА БЛИЗКО **И** ОБЛАСТЬ МОЛЧИТ.
 *
 *  — веха близко: инсайт привязан к gate текущего горизонта (`insight.gate`). Простановка
 *    вех у 27 накопленных инсайтов — отдельная ручная карточка; без привязки инсайт НЕ
 *    всплывёт (названная владельцем цена).
 *  — область молчит: за окном [since, now] (since = max(lastGateTransition, now − N)) ни
 *    один коммит не трогал область инсайта. Трогали → это рутина, подсветка усилила бы
 *    её вместо подъёма над ней (отвергнутое буквальное чтение).
 *
 * @param {{gate?: string, area?: string, tags?: string[]}} insight
 * @param {{gate: string, lastGateTransition?: string|null}} horizon
 * @param {readonly {date: string, files: string[]}[]} gitLog
 * @param {{now: string|number, silenceDays?: number}} opts
 * @returns {boolean}
 */
export function isTimely(insight, horizon, gitLog, opts) {
  const insightGate = String(insight?.gate ?? '').trim();
  const vehaClose = insightGate !== '' && insightGate === String(horizon?.gate ?? '').trim();
  if (!vehaClose) return false;

  const nowMs = parseMs(opts?.now);
  if (nowMs == null) throw new Error('isTimely: opts.now обязателен');
  const sinceMs = horizonSince(horizon, nowMs, opts?.silenceDays ?? DEFAULT_SILENCE_DAYS);

  const noisy = (gitLog ?? []).some((commit) => {
    const cMs = parseMs(commit?.date);
    if (cMs == null || cMs < sinceMs || cMs > nowMs) return false;
    return touchesArea(commit?.files ?? [], insight);
  });
  return !noisy;
}

/**
 * Нормализовать инсайт/ресёрч-артефакт к единому кандидату-свидетельству. `origin` —
 * человекочитаемый первоисточник; его хеш и есть ключ дедупа эха (Q5). Формы:
 *   insight  → docs/insights/registry.json: {id, title, source, createdAt, ...}
 *   research → docs/research/night/<date>-<slug>.md фронтматтер: {topic, origin, status, ...}
 *
 * @param {'insight'|'research'} kind
 * @param {any} item
 * @returns {{kind: string, ref: string, title: string, origin: string, date: string|null, raw: any}}
 */
function toCandidate(kind, item) {
  if (kind === 'insight') {
    return {
      kind,
      ref: String(item?.id ?? ''),
      title: String(item?.title ?? item?.id ?? ''),
      // Первоисточник инсайта = его СОБСТВЕННЫЙ id, а не поле `source` (`packaging-epic`,
      // `user` — грубая КАТЕГОРИЯ, общая у разных инсайтов; по ней дедуп ложно склеил бы
      // 29 инсайтов в 10). Эхо для инсайта = один и тот же id, пришедший дважды.
      origin: String(item?.id ?? item?.title ?? ''),
      date: item?.createdAt ? String(item.createdAt) : null,
      raw: item,
    };
  }
  return {
    kind,
    ref: String(item?.slug ?? item?.id ?? item?.topic ?? ''),
    title: String(item?.topic ?? item?.title ?? item?.slug ?? ''),
    origin: String(item?.origin ?? item?.topic ?? item?.slug ?? ''),
    date: item?.date ? String(item.date) : item?.createdAt ? String(item.createdAt) : null,
    raw: item,
  };
}

/**
 * Ядро S1 (Q5): ОДИН читатель обоих каналов. Возвращает `highlights[]` (акценты дня) и
 * `provenance[]` (откуда что пришло, включая видимую пометку о мёртвом канале).
 *
 * Инварианты, вынесенные в DoD:
 *  — Всё вливается как `highlight`; ни у одного канала нет права на `assign`. В выходной
 *    структуре highlight'а НЕТ полей assign/persona/dod — граница структурная.
 *  — Эхо схлопнуто дедупом по origin-hash (переиспользуем dedupeByOrigin), без спецкода.
 *  — Отсутствующий/пустой канал → provenance c present:false и пометкой «канал мёртв», а
 *    не тихий пропуск.
 *  — Детерминизм: highlights отсортированы по (originHash, ref); время — параметром now.
 *
 * @param {{gate: string, lastGateTransition?: string|null}} horizon
 * @param {{insights?: any[]|null, research?: any[]|null}} channels
 * @param {{now: string|number, gitLog?: {date:string,files:string[]}[], silenceDays?: number, staleWindowDays?: number}} opts
 * @returns {{highlights: any[], provenance: any[]}}
 */
export function collectHorizonInputs(horizon, channels, opts) {
  const nowMs = parseMs(opts?.now);
  if (nowMs == null) throw new Error('collectHorizonInputs: opts.now обязателен');
  const gitLog = opts?.gitLog ?? [];
  const silenceDays = opts?.silenceDays ?? DEFAULT_SILENCE_DAYS;
  const staleFloorMs = horizonSince(horizon, nowMs, opts?.staleWindowDays ?? DEFAULT_STALE_WINDOW_DAYS);

  /** @type {any[]} */
  const provenance = [];

  /** Собрать кандидатов канала + записать provenance (в т.ч. «канал мёртв»). */
  const gather = (kind, list) => {
    if (list == null) {
      provenance.push({ channel: kind, present: false, count: 0, note: 'канал мёртв: вход отсутствует (null)' });
      return [];
    }
    if (!Array.isArray(list) || list.length === 0) {
      provenance.push({ channel: kind, present: false, count: 0, note: 'канал мёртв: вход пуст' });
      return [];
    }
    provenance.push({ channel: kind, present: true, count: list.length });
    return list.map((item) => toCandidate(kind, item));
  };

  const candidates = [...gather('insight', channels?.insights), ...gather('research', channels?.research)];

  // Дедуп эха по origin-hash — переиспользуем truth-graph, спецкода нет. Три отражения
  // одного первоисточника схлопываются в один голос (reflections считает, сколько было).
  const deduped = dedupeByOrigin(candidates);

  const highlights = deduped.map((cand) => {
    const dateMs = parseMs(cand.date);
    const stale = dateMs != null && dateMs < staleFloorMs;
    const timely =
      cand.kind === 'insight'
        ? isTimely(cand.raw, horizon, gitLog, { now: nowMs, silenceDays })
        : true; // ресёрч = сон системы, всегда акцент; своевременность к нему не применяется
    // ВНИМАНИЕ: никакого assign/persona/dod. Только описание акцента (Q1).
    return {
      kind: cand.kind,
      ref: cand.ref,
      title: cand.title,
      timely,
      stale,
      staleBadge: stale ? cand.date : null,
      originHash: cand.originHash ?? originHash(cand.origin),
      reflections: cand.reflections ?? 1,
    };
  });

  highlights.sort((a, b) => {
    if (a.originHash !== b.originHash) return a.originHash < b.originHash ? -1 : 1;
    return a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0;
  });

  return { highlights, provenance };
}
