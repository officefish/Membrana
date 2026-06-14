import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const REGISTRY_REL = 'docs/tasks/registry.json';
export const TASKS_README_REL = 'docs/tasks/README.md';
export const ARCHIVE_DIR_REL = 'docs/tasks/archive';

/**
 * @typedef {'active' | 'archived'} TaskStatus
 * @typedef {'S' | 'M' | 'L'} TaskSize
 *
 * @typedef {object} TaskEntry
 * @property {string} id
 * @property {string} title
 * @property {string} promptPath
 * @property {number | null} githubIssue
 * @property {string | null} linearId
 * @property {TaskSize} size
 * @property {TaskStatus} status
 * @property {string} createdAt
 * @property {string | null} archivedAt
 * @property {string | null} archiveNotes
 * @property {string | null} [githubIssueClosedAt] ISO date; null — Issue ещё не закрыт на GitHub (очередь вечернего скрипта)
 */

/** @param {string} [cwd] */
export function resolveRegistryPath(cwd = process.cwd()) {
  return resolve(cwd, REGISTRY_REL);
}

/** @param {string} [cwd] */
export function loadRegistry(cwd = process.cwd()) {
  const path = resolveRegistryPath(cwd);
  if (!existsSync(path)) {
    return { version: 1, tasks: [] };
  }
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.tasks)) {
    throw new Error(`${REGISTRY_REL}: поле "tasks" должно быть массивом`);
  }
  return data;
}

/**
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} [cwd]
 */
export function saveRegistry(registry, cwd = process.cwd()) {
  const path = resolveRegistryPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

/** @param {{ version: number, tasks: TaskEntry[] }} registry */
export function listActive(registry) {
  return registry.tasks.filter((t) => t.status === 'active');
}

/** @param {{ version: number, tasks: TaskEntry[] }} registry */
export function listArchived(registry) {
  return registry.tasks.filter((t) => t.status === 'archived');
}

/** Архивные задачи с Issue, которые ещё не закрыты на GitHub. */
export function listPendingGithubClose(registry) {
  return listArchived(registry).filter(
    (t) => t.githubIssue != null && !t.githubIssueClosedAt,
  );
}

/**
 * Текст комментария для GitHub Issue из карточки архива.
 * @param {string} cardMarkdown
 */
export function extractGithubIssueReport(cardMarkdown) {
  const reportHeader = '## Отчёт о выполнении';
  const notesHeader = '## Заметки при закрытии';
  const reportIdx = cardMarkdown.indexOf(reportHeader);
  if (reportIdx !== -1) {
    const after = cardMarkdown.slice(reportIdx + reportHeader.length);
    const end = after.search(/\n## |\n---\n/);
    const block = (end === -1 ? after : after.slice(0, end)).trim();
    if (block) return `${reportHeader}\n\n${block}`;
  }
  const notesIdx = cardMarkdown.indexOf(notesHeader);
  if (notesIdx !== -1) {
    const after = cardMarkdown.slice(notesIdx);
    const end = after.search(/\n---\n/);
    return (end === -1 ? after : after.slice(0, end)).trim();
  }
  return cardMarkdown.trim();
}

/**
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} id
 */
export function findTask(registry, id) {
  return registry.tasks.find((t) => t.id === id) ?? null;
}

/** @param {string} id */
export function validateTaskId(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(
      `Некорректный id "${id}": используй kebab-case (a-z, 0-9, дефис).`,
    );
  }
}

/**
 * @param {TaskEntry} task
 * @param {string} [cwd]
 */
export function archiveCardPath(task, cwd = process.cwd()) {
  return resolve(cwd, ARCHIVE_DIR_REL, `${task.id}.md`);
}

/**
 * @param {TaskEntry} task
 * @param {string} [cwd]
 */
export function writeArchiveCard(task, cwd = process.cwd()) {
  const dir = resolve(cwd, ARCHIVE_DIR_REL);
  mkdirSync(dir, { recursive: true });
  const path = archiveCardPath(task, cwd);
  const issue =
    task.githubIssue != null ? `#${task.githubIssue}` : '—';
  const linear = task.linearId ?? '—';
  const notes = task.archiveNotes?.trim() || '—';

  const body = `# Архив: ${task.title}

| Поле | Значение |
|------|----------|
| **ID** | \`${task.id}\` |
| **Статус** | archived |
| **Размер** | ${task.size} |
| **Создана** | ${task.createdAt} |
| **Архивирована** | ${task.archivedAt ?? '—'} |
| **GitHub Issue** | ${issue} |
| **Linear** | ${linear} |
| **Промпт** | [\`${task.promptPath}\`](../../${task.promptPath.replace(/\\/g, '/')}) |

## Заметки при закрытии

${notes}

---

*Карточка сгенерирована \`yarn task:archive\`. Спецификация остаётся в \`docs/prompts/\`.*
`;

  writeFileSync(path, body, 'utf8');
  return path;
}

/**
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} [cwd]
 */
export function renderTasksReadme(registry, cwd = process.cwd()) {
  const active = listActive(registry);
  const archived = listArchived(registry).sort((a, b) =>
    (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''),
  );

  const row = (t) => {
    const prompt = `[\`${t.promptPath.split('/').pop()}\`](../${t.promptPath})`;
    const gh = t.githubIssue != null ? `[#${t.githubIssue}](https://github.com/officefish/Membrana/issues/${t.githubIssue})` : '—';
    return `| \`${t.id}\` | ${t.title} | ${t.size} | ${prompt} | ${gh} |`;
  };

  const archivedRow = (t) => {
    const prompt = `[\`${t.promptPath.split('/').pop()}\`](../${t.promptPath})`;
    const card = `[карточка](./archive/${t.id}.md)`;
    const gh = t.githubIssue != null ? `#${t.githubIssue}` : '—';
    const ghPending =
      t.githubIssue != null && !t.githubIssueClosedAt ? ' (Issue открыт)' : '';
    return `| \`${t.id}\` | ${t.title} | ${t.archivedAt ?? '—'} | ${prompt} | ${gh}${ghPending} | ${card} |`;
  };

  return `# Реестр задач (task prompts)

Актуальные **активные** и **архивные** задачи по стандарту
[\`TASK_PROMPT_WORKFLOW.md\`](../prompts/TASK_PROMPT_WORKFLOW.md).

Машиночитаемый источник: [\`registry.json\`](./registry.json).

| Команда | Действие |
|---------|----------|
| \`yarn task:list\` | Список в терминале |
| \`yarn task:sync-readme\` | Пересобрать этот файл |
| \`yarn task:archive <id>\` | Закрыть задачу в реестре |
| \`yarn task:close-github\` | Закрыть Issues по очереди из архива (вечером) |

---

## Активные задачи

${
  active.length === 0
    ? '_Нет активных задач. Новую добавь в `registry.json` (см. workflow)._'
    : `| ID | Название | Размер | Промпт | GitHub |
|----|----------|--------|--------|--------|
${active.map(row).join('\n')}`
}

---

## Архив

${
  archived.length === 0
    ? '_Архив пуст._'
    : `| ID | Название | Архивировано | Промпт | GitHub | Карточка |
|----|----------|--------------|--------|--------|----------|
${archived.map(archivedRow).join('\n')}`
}

---

## Как добавить задачу

1. GitHub Issue → [\`TASKS_MANAGEMENT.md\`](../TASKS_MANAGEMENT.md).
2. Скопировать [\`TASK_PROMPT_TEMPLATE.md\`](../prompts/TASK_PROMPT_TEMPLATE.md) в \`docs/prompts/<SLUG>_PROMPT.md\`.
3. Добавить объект в \`registry.json\` (\`"status": "active"\`).
4. \`yarn task:sync-readme\`.

*Файл обновлён автоматически: ${new Date().toISOString().slice(0, 10)}.*
`;
}

/**
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} [cwd]
 */
export function syncTasksReadme(registry, cwd = process.cwd()) {
  const path = resolve(cwd, TASKS_README_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderTasksReadme(registry, cwd), 'utf8');
  return path;
}
