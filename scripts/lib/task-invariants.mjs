/**
 * checkCardIntegrity — инварианты сцепки карточки (M4C / #1062 / EPIC V6).
 *
 * Чистая функция: без сети и без fs. Внешние факты — слепок `apiCache`.
 * Канон: docs/seanses/tasks-workshop-m4c-invariants-2026-07-23.md · EPIC V6.
 *
 * Граница с `task:validate` (V5): валидность — «цела ли карточка как запись»;
 * инварианты — «жива ли сцепка с Linear/GitHub и провенанс закрытия».
 * Поглощения нет.
 *
 * Автовосстановление запрещено: repair — только явный план + --execute.
 */

/** @typedef {'HARD_BLOCK' | 'WARNING' | 'DATALOSS'} InvariantLevel */
/** @typedef {'green' | 'yellow' | 'red' | 'unchecked'} SyncColor */
/** @typedef {'open' | 'closed' | 'missing' | 'unknown'} LinkLiveState */

/**
 * @typedef {object} InvariantViolation
 * @property {string} invariant  linear-live | github-exists | closed-at
 * @property {InvariantLevel} level
 * @property {string} cardId
 * @property {string} field
 * @property {string} message
 * @property {string} code
 * @property {string[]} [suggestions]
 */

/**
 * Слепок внешних фактов для проверки сцепки.
 * Ключи linear — `linearId`; github — номер иссью (строка или число в Record).
 *
 * @typedef {object} InvariantsApiCache
 * @property {Record<string, LinkLiveState>} [linear]
 * @property {Record<string, LinkLiveState>} [github]
 * @property {string | null} [fetchedAt] ISO
 * @property {'fast' | 'full' | 'none'} [source]
 */

/**
 * @typedef {object} CardIntegrityResult
 * @property {SyncColor} status
 * @property {InvariantViolation[]} violations
 * @property {{ status: SyncColor, lastChecked: string | null, reason?: string, suggestions?: string[] }} sync
 */

/**
 * @typedef {object} RegistryIntegrityResult
 * @property {Record<string, CardIntegrityResult>} byCard
 * @property {{ green: number, yellow: number, red: number, unchecked: number, cards: number }} summary
 * @property {InvariantViolation[]} violations
 */

/** TTL кэша полного прогона (4 часа) — вердикт M4C. */
export const INVARIANTS_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const LEVEL_RANK = Object.freeze({ DATALOSS: 1, WARNING: 2, HARD_BLOCK: 3 });

/** Linear stateType / агрегат «открыт» для инварианта 1. */
const LINEAR_OPEN = new Set(['open', 'started', 'in_progress', 'in-progress', 'unstarted', 'backlog', 'triage']);

/**
 * @param {InvariantLevel | null | undefined} a
 * @param {InvariantLevel | null | undefined} b
 */
export function maxInvariantLevel(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

/**
 * @param {InvariantViolation[]} violations
 * @returns {SyncColor}
 */
export function colorFromViolations(violations) {
  if (!violations.length) return 'green';
  if (violations.some((v) => v.level === 'HARD_BLOCK')) return 'red';
  return 'yellow';
}

/**
 * Нормализует Linear live-state из сырого stateType / open|closed.
 * @param {string | null | undefined} raw
 * @returns {LinkLiveState | null}
 */
export function normalizeLinearLiveState(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (s === 'missing' || s === 'unknown') return /** @type {LinkLiveState} */ (s);
  if (s === 'closed' || s === 'completed' || s === 'canceled' || s === 'cancelled' || s === 'done') {
    return 'closed';
  }
  if (LINEAR_OPEN.has(s) || s === 'open') return 'open';
  // Неизвестный тип — не выдумываем closed; честный unknown.
  return 'unknown';
}

/**
 * @param {string | null | undefined} raw
 * @returns {LinkLiveState | null}
 */
export function normalizeGithubLiveState(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (s === 'missing' || s === 'unknown') return /** @type {LinkLiveState} */ (s);
  if (s === 'closed') return 'closed';
  if (s === 'open') return 'open';
  return 'unknown';
}

/**
 * @param {InvariantsApiCache | null | undefined} cache
 * @param {string} linearId
 * @returns {LinkLiveState}
 */
function lookupLinear(cache, linearId) {
  if (!cache?.linear) return 'unknown';
  const v = cache.linear[linearId] ?? cache.linear[linearId.toUpperCase()];
  return normalizeLinearLiveState(v) ?? 'unknown';
}

/**
 * @param {InvariantsApiCache | null | undefined} cache
 * @param {number} issue
 * @returns {LinkLiveState}
 */
function lookupGithub(cache, issue) {
  if (!cache?.github) return 'unknown';
  const v = cache.github[String(issue)] ?? cache.github[issue];
  return normalizeGithubLiveState(v) ?? 'unknown';
}

/**
 * @param {object} p
 * @returns {InvariantViolation}
 */
function violation(p) {
  return {
    invariant: p.invariant,
    level: p.level,
    cardId: p.cardId,
    field: p.field,
    message: p.message,
    code: p.code,
    suggestions: p.suggestions,
  };
}

/**
 * checkCardIntegrity(card, apiCache?) — три инварианта EPIC V6.
 *
 * Без apiCache / при unknown: нарушение не поднимается (неизвестность ≠ HARD_BLOCK).
 * Тогда status = unchecked, если проверять было что (есть linearId/githubIssue).
 *
 * @param {object} card
 * @param {InvariantsApiCache | null | undefined} [apiCache]
 * @returns {CardIntegrityResult}
 */
export function checkCardIntegrity(card, apiCache) {
  /** @type {InvariantViolation[]} */
  const violations = [];
  const cardId = card?.id != null ? String(card.id) : '(без id)';
  const hasCache = Boolean(apiCache && (apiCache.linear || apiCache.github));
  let sawUnknown = false;

  const linearId =
    typeof card?.linearId === 'string' && card.linearId.trim() ? card.linearId.trim() : null;
  const issueN = card?.githubIssue != null && Number(card.githubIssue) > 0 ? Number(card.githubIssue) : null;
  const isActive = card?.status === 'active';

  // 1. active + linearId → тикет существует и открыт (HARD_BLOCK)
  if (isActive && linearId) {
    const live = lookupLinear(apiCache, linearId);
    if (live === 'unknown') {
      sawUnknown = true;
    } else if (live === 'missing' || live === 'closed') {
      violations.push(
        violation({
          invariant: 'linear-live',
          level: 'HARD_BLOCK',
          cardId,
          field: 'linearId',
          message:
            live === 'missing'
              ? `active + linearId «${linearId}» — тикет не существует`
              : `active + linearId «${linearId}» — тикет закрыт/архивирован, ожидается открытый`,
          code: live === 'missing' ? 'invariant.linear.missing' : 'invariant.linear.closed',
          suggestions: [
            `yarn task:invariants:repair ${cardId} --clear-linear --execute`,
            `yarn task:invariants:repair ${cardId} --manual-linear <DRU-N> --execute`,
            `yarn task:start — создать новый Linear twin (--link-new не авто)`,
          ],
        }),
      );
    }
  }

  // 2. githubIssue → иссью существует и доступна (WARNING при мёртвой ссылке)
  if (issueN != null) {
    const live = lookupGithub(apiCache, issueN);
    if (live === 'unknown') {
      sawUnknown = true;
    } else if (live === 'missing') {
      violations.push(
        violation({
          invariant: 'github-exists',
          level: 'WARNING',
          cardId,
          field: 'githubIssue',
          message: `githubIssue #${issueN} не существует или недоступна (мёртвая ссылка)`,
          code: 'invariant.github.missing',
          suggestions: [
            `yarn task:invariants:repair ${cardId} --clear-issue --execute`,
            `yarn task:invariants:repair ${cardId} --manual-issue <N> --execute`,
          ],
        }),
      );
    }

    // 3. Issue closed → githubIssueClosedAt заполнена (DATALOSS)
    if (live === 'closed') {
      const closedAt = card?.githubIssueClosedAt;
      if (closedAt == null || closedAt === '') {
        violations.push(
          violation({
            invariant: 'closed-at',
            level: 'DATALOSS',
            cardId,
            field: 'githubIssueClosedAt',
            message: `иссью #${issueN} закрыта, но githubIssueClosedAt пуст — дыра в провенансе`,
            code: 'invariant.closedAt.missing',
            suggestions: [`yarn tasks:sync-issues`, `yarn tasks:sync-issues:dry`],
          }),
        );
      }
    }
  }

  let status = colorFromViolations(violations);
  if (status === 'green' && !hasCache && (linearId || issueN != null)) {
    status = 'unchecked';
  } else if (status === 'green' && sawUnknown && violations.length === 0 && (linearId || issueN != null)) {
    // Частичный кэш с unknown по нужным полям — не врём «green».
    const needLinear = isActive && linearId;
    const needGh = issueN != null;
    const linU = needLinear && lookupLinear(apiCache, linearId) === 'unknown';
    const ghU = needGh && lookupGithub(apiCache, issueN) === 'unknown';
    if (linU || ghU) status = 'unchecked';
  }

  const top = violations[0];
  /** @type {string[]} */
  const suggestions = [];
  for (const v of violations) {
    for (const s of v.suggestions ?? []) {
      if (!suggestions.includes(s)) suggestions.push(s);
    }
  }

  return {
    status,
    violations,
    sync: {
      status,
      lastChecked: apiCache?.fetchedAt ?? null,
      reason: top?.message,
      suggestions: suggestions.length ? suggestions : undefined,
    },
  };
}

/**
 * @param {object[]} cards
 * @param {InvariantsApiCache | null | undefined} [apiCache]
 * @returns {RegistryIntegrityResult}
 */
export function checkRegistryIntegrity(cards, apiCache) {
  /** @type {Record<string, CardIntegrityResult>} */
  const byCard = {};
  /** @type {InvariantViolation[]} */
  const violations = [];
  const summary = { green: 0, yellow: 0, red: 0, unchecked: 0, cards: 0 };

  for (const card of cards ?? []) {
    if (!card?.id) continue;
    const r = checkCardIntegrity(card, apiCache);
    byCard[card.id] = r;
    summary.cards += 1;
    summary[r.status] += 1;
    violations.push(...r.violations);
  }

  return { byCard, summary, violations };
}

/**
 * Кэш свеж, если fetchedAt в пределах TTL.
 * @param {InvariantsApiCache | null | undefined} cache
 * @param {number} [now]
 * @param {number} [ttlMs]
 */
export function isInvariantsCacheFresh(cache, now = Date.now(), ttlMs = INVARIANTS_CACHE_TTL_MS) {
  if (!cache?.fetchedAt) return false;
  const t = Date.parse(cache.fetchedAt);
  if (Number.isNaN(t)) return false;
  return now - t <= ttlMs;
}

/**
 * План починки (чистый) — без записи на диск.
 *
 * @param {object} card
 * @param {{ clearLinear?: boolean, manualLinear?: string | null, clearIssue?: boolean, manualIssue?: number | null }} action
 * @returns {{ ok: boolean, patch: Record<string, unknown>, message: string }}
 */
export function planLinkageRepair(card, action) {
  if (!card || typeof card !== 'object' || !card.id) {
    return { ok: false, patch: {}, message: 'карточка отсутствует' };
  }
  /** @type {Record<string, unknown>} */
  const patch = {};
  const parts = [];

  if (action.clearLinear) {
    patch.linearId = null;
    parts.push('linearId → null');
  } else if (action.manualLinear != null && String(action.manualLinear).trim()) {
    patch.linearId = String(action.manualLinear).trim();
    parts.push(`linearId → ${patch.linearId}`);
  }

  if (action.clearIssue) {
    patch.githubIssue = null;
    patch.githubIssueClosedAt = null;
    patch.githubIssueStateReason = null;
    parts.push('githubIssue → null (+ closedAt/reason)');
  } else if (action.manualIssue != null && Number(action.manualIssue) > 0) {
    patch.githubIssue = Number(action.manualIssue);
    parts.push(`githubIssue → #${patch.githubIssue}`);
  }

  if (!parts.length) {
    return {
      ok: false,
      patch: {},
      message:
        'нужен флаг: --clear-linear | --manual-linear <id> | --clear-issue | --manual-issue <N>',
    };
  }

  return {
    ok: true,
    patch,
    message: `repair ${card.id}: ${parts.join('; ')}`,
  };
}

/**
 * Текстовый отчёт CLI.
 * @param {RegistryIntegrityResult | CardIntegrityResult} result
 * @param {{ title?: string, cardId?: string }} [opts]
 */
export function formatInvariantsReport(result, opts = {}) {
  const title = opts.title ?? 'task:invariants';
  const lines = [title, ''];

  if ('summary' in result) {
    const s = result.summary;
    lines.push(
      `карточек: ${s.cards} · 🟢 ${s.green} · 🟡 ${s.yellow} · 🔴 ${s.red} · ⬜ ${s.unchecked}`,
    );
    lines.push('');
    const flagged = Object.entries(result.byCard).filter(([, r]) => r.status !== 'green');
    for (const [id, r] of flagged) {
      lines.push(`[${r.status}] ${id}`);
      for (const v of r.violations) {
        lines.push(`  - ${v.level} ${v.invariant}: ${v.message}`);
      }
    }
    if (!flagged.length) lines.push('(нарушений нет)');
  } else {
    lines.push(`status: ${result.status}`);
    for (const v of result.violations) {
      lines.push(`  - ${v.level} ${v.invariant}: ${v.message}`);
    }
    if (!result.violations.length) lines.push('(нарушений нет)');
  }

  return lines.join('\n');
}
