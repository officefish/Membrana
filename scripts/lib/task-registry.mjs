import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const REGISTRY_REL = 'docs/tasks/registry.json';
export const TASKS_README_REL = 'docs/tasks/README.md';
export const ARCHIVE_DIR_REL = 'docs/tasks/archive';
export const ARCHIVE_LOG_REL = 'docs/tasks/archive.jsonl';

export const HOT_TASK_STATUSES = new Set(['draft', 'active', 'review', 'paused', 'deferred']);
export const RITUAL_TASK_STATUSES = new Set(['active', 'review']);
export const CLOSED_TASK_STATUSES = new Set(['archived', 'closed', 'completed']);

/**
 * @typedef {'draft' | 'active' | 'review' | 'paused' | 'deferred' | 'archived' | 'closed' | 'completed'} TaskStatus
 * @typedef {'S' | 'M' | 'L'} TaskSize
 *
 * @typedef {object} TaskEntry
 * @property {string} id
 * @property {string} title
 * @property {string | null} promptPath
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
  atomicWriteJson(path, registry);
}

/** @param {{ version: number, tasks: TaskEntry[] }} registry */
export function listActive(registry) {
  return registry.tasks.filter((t) => t.status === 'active');
}

/** Entries with prompt excerpts that can safely feed morning rituals. */
export function listRitualTasks(registry) {
  return registry.tasks.filter((t) =>
    RITUAL_TASK_STATUSES.has(t.status) && typeof t.promptPath === 'string' && t.promptPath.trim(),
  );
}

/** Active/review entries that need promptPath repair before they can feed rituals. */
export function listRitualPromptPathProblems(registry) {
  return registry.tasks.filter((t) =>
    RITUAL_TASK_STATUSES.has(t.status) && !(typeof t.promptPath === 'string' && t.promptPath.trim()),
  );
}

/** @param {{ version: number, tasks: TaskEntry[] }} registry */
export function listArchived(registry) {
  return registry.tasks.filter((t) => t.status === 'archived');
}

/** @param {string} path @param {unknown} data */
function atomicWriteJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, path);
}

/** @param {string} [cwd] */
export function resolveArchiveLogPath(cwd = process.cwd()) {
  return resolve(cwd, ARCHIVE_LOG_REL);
}

/** @param {TaskEntry} task */
export function normalizeArchiveRecord(task) {
  return {
    ...task,
    status: 'archived',
    archivedAt: task.archivedAt ?? new Date().toISOString().slice(0, 10),
    archiveSchemaVersion: 1,
  };
}

/** @param {string} [cwd] */
export function loadArchiveLog(cwd = process.cwd()) {
  const path = resolveArchiveLogPath(cwd);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf8').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/u).map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${ARCHIVE_LOG_REL}:${idx + 1}: invalid JSONL record: ${error.message}`);
    }
  });
}

/** @param {TaskEntry[]} records @param {string} [cwd] */
export function saveArchiveLog(records, cwd = process.cwd()) {
  const path = resolveArchiveLogPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  const body = records.map((record) => JSON.stringify(normalizeArchiveRecord(record))).join('\n');
  writeFileSync(tmpPath, body ? `${body}\n` : '', 'utf8');
  renameSync(tmpPath, path);
  return path;
}

/** @param {TaskEntry} task @param {string} [cwd] */
export function appendArchiveLog(task, cwd = process.cwd()) {
  const records = loadArchiveLog(cwd);
  if (!records.some((record) => record.id === task.id)) {
    records.push(normalizeArchiveRecord(task));
    saveArchiveLog(records, cwd);
  }
  return resolveArchiveLogPath(cwd);
}

/**
 * New archive log + legacy archived rows in registry during migration.
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} [cwd]
 */
export function listArchivedAll(registry, cwd = process.cwd()) {
  const byId = new Map();
  for (const task of loadArchiveLog(cwd)) byId.set(task.id, task);
  for (const task of listArchived(registry)) {
    if (!byId.has(task.id)) byId.set(task.id, task);
  }
  return [...byId.values()];
}

/** Архивные задачи с Issue, которые ещё не закрыты на GitHub. */
export function listPendingGithubClose(registry) {
  return listArchivedAll(registry).filter(
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

export function findArchivedTask(registry, id, cwd = process.cwd()) {
  return listArchivedAll(registry, cwd).find((t) => t.id === id) ?? null;
}

/**
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {{ allowLegacyClosed?: boolean }} [options]
 */
export function validateRegistryContract(registry, options = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const task of registry.tasks) {
    if (!task?.id) {
      errors.push('task without id');
      continue;
    }
    if (seen.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
    seen.add(task.id);

    if (!HOT_TASK_STATUSES.has(task.status)) {
      const message = `${task.id}: status "${task.status}" is not hot-registry status`;
      if (options.allowLegacyClosed && CLOSED_TASK_STATUSES.has(task.status)) warnings.push(`legacy: ${message}`);
      else errors.push(message);
      if (CLOSED_TASK_STATUSES.has(task.status)) continue;
    }

    const hasPrompt = typeof task.promptPath === 'string' && task.promptPath.trim().length > 0;
    if (!hasPrompt && task.status !== 'draft' && task.status !== 'deferred') {
      errors.push(`${task.id}: promptPath is required for status "${task.status}"`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Move task from hot registry to archive log and legacy card.
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} id
 * @param {{ notes?: string | null, force?: boolean, cwd?: string }} [options]
 */
export function archiveTask(registry, id, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const index = registry.tasks.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Task not found in registry: ${id}`);
  const task = registry.tasks[index];
  if (task.status === 'archived' && !options.force) {
    throw new Error(`Task "${id}" already archived (${task.archivedAt ?? '?'})`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const archived = normalizeArchiveRecord({
    ...task,
    status: 'archived',
    archivedAt: today,
    archiveNotes: options.notes ?? task.archiveNotes ?? null,
    githubIssueClosedAt:
      task.githubIssue != null ? (task.githubIssueClosedAt ?? null) : (task.githubIssueClosedAt ?? null),
  });

  appendArchiveLog(archived, cwd);
  if (task.status === 'archived') {
    registry.tasks[index] = archived;
  } else {
    registry.tasks.splice(index, 1);
  }
  return archived;
}

/**
 * @param {string} taskId
 * @param {string} closedAt
 * @param {string} [cwd]
 */
export function markArchiveGithubIssueClosed(taskId, closedAt, cwd = process.cwd()) {
  const records = loadArchiveLog(cwd);
  const index = records.findIndex((record) => record.id === taskId);
  if (index === -1) return false;
  records[index] = { ...records[index], githubIssueClosedAt: closedAt };
  saveArchiveLog(records, cwd);
  return true;
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
| **Промпт** | ${task.promptPath ? `[\`${task.promptPath}\`](../../${task.promptPath.replace(/\\/g, '/')})` : '—'} |

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
  const archived = listArchivedAll(registry, cwd).sort((a, b) =>
    (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''),
  );

  const row = (t) => {
    const prompt = t.promptPath ? `[\`${t.promptPath.split('/').pop()}\`](../${t.promptPath})` : '—';
    const gh = t.githubIssue != null ? `[#${t.githubIssue}](https://github.com/officefish/Membrana/issues/${t.githubIssue})` : '—';
    return `| \`${t.id}\` | ${t.title} | ${t.size} | ${prompt} | ${gh} |`;
  };

  const archivedRow = (t) => {
    const prompt = t.promptPath ? `[\`${t.promptPath.split('/').pop()}\`](../${t.promptPath})` : '—';
    const card = `[карточка](./archive/${t.id}.md)`;
    const gh = t.githubIssue != null ? `#${t.githubIssue}` : '—';
    const ghPending =
      t.githubIssue != null && !t.githubIssueClosedAt ? ' (Issue открыт)' : '';
    return `| \`${t.id}\` | ${t.title} | ${t.archivedAt ?? '—'} | ${prompt} | ${gh}${ghPending} | ${card} |`;
  };

  return `# Реестр задач (task prompts)

Актуальные **активные** и **архивные** задачи по стандарту
[\`TASK_PROMPT_WORKFLOW.md\`](../prompts/TASK_PROMPT_WORKFLOW.md).

Машиночитаемые источники:

- [\`registry.json\`](./registry.json) — hot registry для открытых задач.
- [\`archive.jsonl\`](./archive.jsonl) — cold archive для закрытых задач (new path; legacy archived rows still read during migration).

Контракт хранения: [\`TASK_REGISTRY_STORAGE.md\`](./TASK_REGISTRY_STORAGE.md).

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
