/**
 * membrana-leveling — disposition(path, ctx) (K1 / §8.2).
 *
 * Чистая функция: без сети/LLM/git. Все факты — порты ctx (снимок снаружи).
 * Порядок first-match — регламент §2 (post-fix R2): live ДО fallback-trash.
 *
 * @see docs/prompts/MEMBRANA_LEVELING_DISPOSITION_PROMPT.md
 * @see docs/prompts/MEMBRANA_LEVELING_REGULATION.md §2
 */

/** @typedef {'live' | 'ready' | 'unfinished' | 'trash'} Disposition */

/**
 * Контракт ctx (порты). Булевы факты читаются как есть; решение выставить
 * `registered` / `leadStamp` — человек/тимлид (T8), вне функции.
 *
 * `inActiveSession` — факт session-lock / membership path в активной сессии
 * оркестратора (**не** голый mtime; gap M1 закрыт контрактом, не эвристикой).
 *
 * @typedef {object} DispositionCtx
 * @property {boolean} [dirty]
 * @property {boolean} [registered]
 * @property {boolean} [inActiveSession]
 * @property {boolean} [ciGreen]
 * @property {boolean} [conflictsMain]
 * @property {boolean} [prApproved]
 * @property {boolean} [leadStamp]
 * @property {boolean} [isTempOrScratch] если задан — перекрывает path-эвристику
 * @property {string | null} [unitOf] единица поставки (PR/ветка/карточка); порт учёта
 */

/**
 * Эвристика расположения: temp/scratch → trash даже в сессии (шаг 1).
 * Оркестратор может перекрыть портом `ctx.isTempOrScratch`.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function inferTempOrScratch(path) {
  const n = String(path ?? '')
    .replace(/\\/gu, '/')
    .replace(/^\.\//u, '');
  if (!n) return false;
  const lower = n.toLowerCase();
  if (
    lower.includes('/appdata/local/temp/') ||
    lower.includes('/appdata/local/tmp/') ||
    lower.startsWith('%temp%/') ||
    lower.startsWith('%tmp%/') ||
    lower.startsWith('$tmpdir/') ||
    lower.startsWith('/tmp/') ||
    lower.startsWith('/var/tmp/')
  ) {
    return true;
  }
  if (
    lower.includes('/scratchpad/') ||
    lower.includes('/.scratch/') ||
    /(^|\/)scratchpad(\/|$)/u.test(lower)
  ) {
    return true;
  }
  if (/\.(tmp|temp|swp|swo)$/iu.test(lower)) return true;
  if (/(^|\/)\.wip(\/|$)/u.test(lower)) return true;
  return false;
}

/**
 * readyFacts(unit) ⇔ ciGreen ∧ ¬conflictsMain ∧ prApproved (без leadStamp).
 *
 * @param {Pick<DispositionCtx, 'ciGreen' | 'conflictsMain' | 'prApproved'>} ctx
 * @returns {boolean}
 */
export function readyFacts(ctx) {
  return Boolean(ctx?.ciGreen) && !ctx?.conflictsMain && Boolean(ctx?.prApproved);
}

/**
 * @param {string} path
 * @param {DispositionCtx} [ctx]
 * @returns {Required<Pick<DispositionCtx, 'dirty' | 'registered' | 'inActiveSession' | 'ciGreen' | 'conflictsMain' | 'prApproved' | 'leadStamp' | 'isTempOrScratch'>> & { unitOf: string | null, path: string }}
 */
export function normalizeDispositionCtx(path, ctx = {}) {
  const isTempOrScratch =
    typeof ctx.isTempOrScratch === 'boolean'
      ? ctx.isTempOrScratch
      : inferTempOrScratch(path);
  return {
    path: String(path ?? ''),
    dirty: Boolean(ctx.dirty),
    registered: Boolean(ctx.registered),
    inActiveSession: Boolean(ctx.inActiveSession),
    ciGreen: Boolean(ctx.ciGreen),
    conflictsMain: Boolean(ctx.conflictsMain),
    prApproved: Boolean(ctx.prApproved),
    leadStamp: Boolean(ctx.leadStamp),
    isTempOrScratch,
    unitOf: ctx.unitOf == null || ctx.unitOf === '' ? null : String(ctx.unitOf),
  };
}

/**
 * disposition(path, ctx) → live | ready | unfinished | trash
 *
 * @param {string} path
 * @param {DispositionCtx} [ctx]
 * @returns {Disposition}
 */
export function disposition(path, ctx = {}) {
  const c = normalizeDispositionCtx(path, ctx);

  // 1. мусор по расположению (даже в активной сессии)
  if (c.isTempOrScratch) return 'trash';

  // 2. активная правка — НЕ трогать (R2); ДО fallback-trash
  if (c.dirty && c.inActiveSession) return 'live';

  // 3. ready: факты + штамп + зарегистрирован + не в сессии
  if (
    c.registered &&
    readyFacts(c) &&
    c.leadStamp &&
    !c.inActiveSession
  ) {
    return 'ready';
  }

  // 4. зарегистрировано, но не ready (в т.ч. readyFacts ∧ ¬stamp)
  if (c.registered) return 'unfinished';

  // 5. fallback: dirty ∧ ¬registered — несохранённый хлам; иначе тотальность → trash
  return 'trash';
}

/**
 * Корзины L/R/U/T для снимка (удобство гейта §8.3; чистая группировка).
 *
 * @param {{ path: string, ctx?: DispositionCtx }[]} items
 * @returns {{ live: string[], ready: string[], unfinished: string[], trash: string[] }}
 */
export function bucketByDisposition(items) {
  /** @type {{ live: string[], ready: string[], unfinished: string[], trash: string[] }} */
  const baskets = { live: [], ready: [], unfinished: [], trash: [] };
  for (const item of items ?? []) {
    const p = item?.path;
    if (typeof p !== 'string' || !p) continue;
    const d = disposition(p, item.ctx ?? {});
    baskets[d].push(p);
  }
  return baskets;
}
