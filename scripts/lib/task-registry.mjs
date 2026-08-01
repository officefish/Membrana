import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { normalizePersona } from './standup-routing.mjs';
import { generateTasksReadme } from './tasks-readme-engine.mjs';

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
 * @property {string | null} [githubIssueClosedAt] ISO date; null — Issue ещё не закрыт на GitHub. Пишут: `task:close-github` (те, что закрывает сам) и `tasks:sync-issues` (закрытые на GitHub любым путём, #620)
 * @property {string | null} [githubIssueStateReason] COMPLETED | NOT_PLANNED — «сделано» vs «отменено»; архив один, история разная (вердикт H1)
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

/**
 * Фазы, ошибочно носящие githubIssue СВОЕГО эпика (ретро #485 п.5).
 *
 * Такая фаза при архивации закрывает Issue всего эпика: task:close-github идёт по
 * githubIssue задачи и не смотрит, чей это Issue. Это не гипотеза — в реестре
 * видно, как #131 и #144 закрылись в одну и ту же секунду 2026-06-30T11:49:58Z.
 * У фазы без своего Issue githubIssue обязан быть null.
 *
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 */
export function findEpicIssueCollisions(registry) {
  const byId = new Map(registry.tasks.map((t) => [t.id, t]));
  return registry.tasks.filter((t) => {
    if (!t.parentEpic || t.githubIssue == null) return false;
    const epic = byId.get(t.parentEpic);
    return Boolean(epic && epic.githubIssue != null && epic.githubIssue === t.githubIssue);
  });
}

/**
 * Архивные задачи с Issue, которые ещё не закрыты на GitHub.
 *
 * Фазы с Issue эпика исключены намеренно (см. findEpicIssueCollisions): молча
 * закрыть чужой эпик хуже, чем не закрыть ничего. task:close-github показывает их
 * отдельным списком, чтобы человек занулил поле или завёл фазе свой Issue.
 */
export function listPendingGithubClose(registry) {
  const collisions = new Set(findEpicIssueCollisions(registry).map((t) => t.id));
  return listArchived(registry).filter(
    (t) => t.githubIssue != null && !t.githubIssueClosedAt && !collisions.has(t.id),
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

const TASK_SIZES = ['S', 'M', 'L'];
// `meeting` добавлен 01.08 (карточка meeting-gates-teeth): регламент заседаний
// (docs/MEETING_REGULATION.md § «Реестр и команды») требует `sprintKind: meeting`
// и `id` вида `meeting-<slug>`, но инструмент такого значения не принимал — и
// единственная карточка с ним в реестре заведена МИМО инструмента. Класс `Db`
// («канон описывает тулинг, которого нет») из заседания meeting-evening-auditor.
// Перечень остаётся закрытым: новое значение — новое слово канона, не «прочее».
const SPRINT_KINDS = [
  'membrana-local-sprint',
  'day-sprint',
  'epic',
  'night-build',
  'competition-sprint',
  'cowork-sprint',
  'meeting',
];

/**
 * Собрать нормализованную запись карточки из полей CLI (#469 ti-3).
 * Валидирует по схеме карточки; поля-константы задаёт как task:archive-совместимые.
 * @param {object} input
 * @returns {TaskEntry}
 */
export function buildTaskEntry(input, today) {
  validateTaskId(input.id);
  if (!input.title?.trim()) throw new Error('Пустой --title.');
  if (!TASK_SIZES.includes(input.size)) {
    throw new Error(`Некорректный --size "${input.size}": ${TASK_SIZES.join('/')}.`);
  }
  const kind = input.kind ?? 'day-sprint';
  if (!SPRINT_KINDS.includes(kind)) {
    throw new Error(`Некорректный --kind "${kind}": ${SPRINT_KINDS.join('/')}.`);
  }
  if (input.issue != null && !Number.isInteger(Number(input.issue))) {
    throw new Error(`Некорректный --issue "${input.issue}": целое число.`);
  }
  // T1 (#548): CLI-флаг --prompt парсер кладёт в input.prompt, а не promptPath —
  // раньше значение игнорилось и карточка получала дефолтный id-путь. Принимаем оба.
  const promptPath =
    input.promptPath ?? input.prompt ?? `docs/prompts/${input.id.replace(/-/g, '_').toUpperCase()}_PROMPT.md`;
  // T1: --parent-epic / --parent → parentEpic (раньше не поддерживалось вовсе →
  // фазы приходилось хэнд-фиксить node-скриптом).
  const parentEpic = input.parentEpic ?? input['parent-epic'] ?? input.parent ?? null;
  const linearRaw = input.linearId ?? input.linear ?? null;
  const linearId =
    linearRaw != null && String(linearRaw).trim() && String(linearRaw).trim() !== '—'
      ? String(linearRaw).trim()
      : null;
  const entry = {
    id: input.id,
    title: input.title.trim(),
    promptPath,
    githubIssue: input.issue != null ? Number(input.issue) : null,
    linearId,
    size: input.size,
    status: 'active',
    sprintKind: kind,
    createdAt: today,
    archivedAt: null,
    // Аватар кладём в канонической форме (имя, не роль): нормализация жила только
    // на ЧТЕНИИ (`normalizePersona` в роутинге), поэтому реестр копил обе записи —
    // 18.07 в нём лежало 9 карточек `musician` и 1 `kuryokhin` на одного аватара.
    // Роутинг это переживал, а любой прямой читатель реестра — нет.
    leadPersona: input.lead ? normalizePersona(input.lead) : null,
    supportPersonas: (input.support ?? []).map(normalizePersona),
    notes: input.notes ?? '',
    archiveNotes: null,
    githubIssueClosedAt: null,
  };
  if (parentEpic) entry.parentEpic = parentEpic;
  if (input.insight) entry.insightId = input.insight;
  return entry;
}

/**
 * Детерминированная вставка карточки в НАЧАЛО tasks[] (конвенция «свежие сверху»).
 * НЕ мутирует вход; дубль id — ошибка. Формат registry не меняется (#469 запрет).
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {TaskEntry} entry
 */
/**
 * Заготовка task-промпта из шаблона (#476 п.5).
 *
 * Зачем: `buildTaskEntry` выводит `promptPath` из id, но файла не создаёт, а
 * `task:review:run` читает его БЕЗУСЛОВНО — closure review падает на ровном месте.
 * 2026-07-15 это случилось дважды за сессию, оба раза в момент закрытия задачи.
 *
 * Заготовка не заменяет постановку: она лишь не даёт гейту упасть и подсказывает,
 * что заполнить. Существующий файл НЕ трогаем — там может быть живая постановка.
 *
 * @param {string} template — текст TASK_PROMPT_TEMPLATE.md
 * @param {{id:string,title:string,size:string,githubIssue?:number|null}} task
 */
export function renderTaskPromptStub(template, task) {
  const issue = task.githubIssue
    ? `[#${task.githubIssue}](https://github.com/officefish/Membrana/issues/${task.githubIssue})`
    : '— (не заведён)';
  return template
    .replace('# Промпт: <краткое название задачи>', `# Промпт: ${task.title}`)
    .replace('Размер задачи: **S | M | L**.', `Размер задачи: **${task.size}**.`)
    .replace('`id` = `<slug>`', `\`id\` = \`${task.id}\``)
    .replace('**GitHub Issue:** #<номер> (после создания).', `**GitHub Issue:** ${issue}`)
    .replace(
      '<!-- Что заметили в эпике, продукте или архитектуре? -->',
      '<!-- ЗАГОТОВКА, созданная yarn task:register. Заполнить до кода. -->',
    );
}

export function insertTaskAtFront(registry, entry) {
  if (registry.tasks.some((t) => t.id === entry.id)) {
    throw new Error(`Карточка "${entry.id}" уже есть в реестре.`);
  }
  return { ...registry, tasks: [entry, ...registry.tasks] };
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
 * Синк README реестра — делегирование в движок стратегических документов (#1201).
 *
 * Карантин `TASKS_README_SYNC_FORCE` снят вместе с его причиной. Он стоял, потому что
 * ad-hoc-генератор `renderTasksReadme` печатал документ целиком из реестра и стирал
 * секции, живущие в файле руками (23.07 — HOME_WORKSHOP из соседней сессии, PR #1087).
 * Теперь ручной текст живёт literal-гранулами шаблона `tasks-readme`, и стирать его
 * нечем: генератор собирает документ из гранул, а не печатает из головы.
 *
 * Новый предохранитель вместо флага: невалидный шаблон уводит сборку в маршрут
 * `experiment`, и файл НЕ пишется. Это гейт по факту (шаблон не сошёлся с гранулами),
 * а не по переменной окружения.
 *
 * @param {{ version: number, tasks: TaskEntry[] }} registry
 * @param {string} [cwd]
 * @param {{ deps?: object }} [opts]
 * @returns {Promise<{ path: string, written: boolean, reason: string|null, route: string }>}
 */
export async function syncTasksReadme(registry, cwd = process.cwd(), opts = {}) {
  const path = resolve(cwd, TASKS_README_REL);
  const { body, route, validation } = await generateTasksReadme(registry, opts.deps ?? {});

  if (route !== 'release') {
    const reasons = validation?.reasons?.join('; ') || 'без причины';
    return {
      path,
      written: false,
      route,
      reason: `шаблон tasks-readme невалиден, README не переписан: ${reasons}`,
    };
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
  return { path, written: true, reason: null, route };
}
