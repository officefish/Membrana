/**
 * Гигиена START: доска (Linear) = движение, Issue = удостоверение.
 * Чистые хелперы без сети — anti-duplicate githubIssue / linearId.
 */

/**
 * Решить, создавать ли новый GitHub Issue при старте.
 *
 * @param {{
 *   existing?: { id: string, githubIssue?: number|null, linearId?: string|null } | null,
 *   requestedIssue?: number|null,
 *   noIssue?: boolean,
 * }} input
 * @returns {{ action: 'reuse'|'create'|'skip', githubIssue: number|null, reason: string }}
 */
export function resolveGithubIssueAction(input) {
  const existingIssue =
    input.existing?.githubIssue != null && Number.isInteger(Number(input.existing.githubIssue))
      ? Number(input.existing.githubIssue)
      : null;
  if (existingIssue != null) {
    return {
      action: 'reuse',
      githubIssue: existingIssue,
      reason: 'registry-already-has-githubIssue',
    };
  }
  if (input.noIssue) {
    return { action: 'skip', githubIssue: null, reason: 'no-issue-flag' };
  }
  if (input.requestedIssue != null && Number.isInteger(Number(input.requestedIssue))) {
    return {
      action: 'reuse',
      githubIssue: Number(input.requestedIssue),
      reason: 'explicit--issue',
    };
  }
  return { action: 'create', githubIssue: null, reason: 'need-new-github-issue' };
}

/**
 * Привязка Linear: не плодить второй ticket, если связь уже есть.
 *
 * @param {{
 *   existingLinearId?: string|null,
 *   requestedLinearId?: string|null,
 * }} input
 * @returns {{ action: 'reuse'|'attach'|'none', linearId: string|null, create: boolean, reason: string }}
 */
export function resolveLinearAttach(input) {
  const existing = normalizeLinearId(input.existingLinearId);
  if (existing) {
    return {
      action: 'reuse',
      linearId: existing,
      create: false,
      reason: 'registry-already-has-linearId',
    };
  }
  const requested = normalizeLinearId(input.requestedLinearId);
  if (requested) {
    return {
      action: 'attach',
      linearId: requested,
      create: false,
      reason: 'explicit--linear',
    };
  }
  return {
    action: 'none',
    linearId: null,
    create: false,
    reason: 'linear-optional-no-create',
  };
}

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeLinearId(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === '—' || s === '-') return null;
  return s;
}

/**
 * Найти карточку и проверить коллизии githubIssue / linearId с чужими id.
 *
 * @param {{ tasks: Array<{ id: string, githubIssue?: number|null, linearId?: string|null }> }} registry
 * @param {{ id: string, githubIssue?: number|null, linearId?: string|null }} patch
 */
export function assertNoLinkCollision(registry, patch) {
  const issue = patch.githubIssue != null ? Number(patch.githubIssue) : null;
  const linear = normalizeLinearId(patch.linearId);
  for (const t of registry.tasks ?? []) {
    if (t.id === patch.id) continue;
    if (issue != null && t.githubIssue != null && Number(t.githubIssue) === issue) {
      throw new Error(
        `githubIssue #${issue} уже привязан к карточке "${t.id}" — не дублировать удостоверение.`,
      );
    }
    const otherLinear = normalizeLinearId(t.linearId);
    if (linear && otherLinear && otherLinear === linear) {
      throw new Error(
        `linearId ${linear} уже привязан к карточке "${t.id}" — доска не плодит twin.`,
      );
    }
  }
}

/**
 * Вставить новую карточку или дописать недостающие связи (anti-duplicate id).
 * Не затирает уже заполненные githubIssue / linearId чужим null.
 *
 * @param {{ version: number, tasks: object[] }} registry
 * @param {object} entry — полная карточка (для insert) или patch с id
 * @param {'insert'|'upsert-links'} [mode]
 */
export function registerOrLinkTask(registry, entry, mode = 'insert') {
  assertNoLinkCollision(registry, entry);
  const idx = registry.tasks.findIndex((t) => t.id === entry.id);
  if (idx === -1) {
    return {
      registry: { ...registry, tasks: [entry, ...registry.tasks] },
      action: 'inserted',
      entry,
    };
  }
  if (mode === 'insert') {
    throw new Error(`Карточка "${entry.id}" уже есть в реестре.`);
  }
  const prev = registry.tasks[idx];
  const nextEntry = {
    ...prev,
    ...entry,
    githubIssue:
      prev.githubIssue != null
        ? prev.githubIssue
        : entry.githubIssue != null
          ? entry.githubIssue
          : null,
    linearId: normalizeLinearId(prev.linearId) ?? normalizeLinearId(entry.linearId),
  };
  assertNoLinkCollision(registry, nextEntry);
  const tasks = registry.tasks.slice();
  tasks[idx] = nextEntry;
  return {
    registry: { ...registry, tasks },
    action: 'upserted-links',
    entry: nextEntry,
  };
}
