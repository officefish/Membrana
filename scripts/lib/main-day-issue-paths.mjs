/**
 * Пути и форматирование реестра для yarn main-day-issue.
 */
export const MAIN_DAY_ISSUE_REL = 'docs/MAIN_DAY_ISSUE.md';
export const CURRENT_TASK_BUFFER_REL = 'docs/CURRENT_TASK.md';

/** @typedef {import('./task-registry.mjs').TaskEntry} TaskEntry */

/**
 * @param {TaskEntry[]} active
 * @param {{ pendingGithubClose: TaskEntry[] }} extra
 */
export function formatRegistryBlock(active, extra = { pendingGithubClose: [] }) {
  const lines = ['### Активные task-промпты (реестр)', ''];

  if (active.length === 0) {
    lines.push('*(активных записей в `docs/tasks/registry.json` нет)*', '');
  } else {
    for (const t of active) {
      const gh = t.githubIssue != null ? ` · GitHub #${t.githubIssue}` : '';
      lines.push(
        `- **\`${t.id}\`** [${t.size}] — ${t.title}${gh}`,
        `  - prompt: \`${t.promptPath}\``,
      );
    }
    lines.push('');
  }

  const pending = extra.pendingGithubClose ?? [];
  if (pending.length > 0) {
    lines.push('### Очередь вечернего закрытия Issues', '');
    for (const t of pending) {
      lines.push(`- \`${t.id}\` — Issue #${t.githubIssue} (архив в реестре, Issue ещё открыт)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * @param {string} focusId
 * @param {TaskEntry[]} active
 */
export function validateFocusId(focusId, active) {
  if (!focusId) return { ok: true };
  const found = active.some((t) => t.id === focusId);
  return found
    ? { ok: true }
    : { ok: false, message: `—focus ${focusId} не найден среди active в реестре` };
}
