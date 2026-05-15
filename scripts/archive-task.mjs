/**
 * Архивирует задачу в docs/tasks/registry.json и создаёт карточку docs/tasks/archive/<id>.md
 *
 * Usage:
 *   yarn task:archive <task-id> [--notes "текст"] [--force]
 */
import {
  archiveCardPath,
  findTask,
  loadRegistry,
  saveRegistry,
  syncTasksReadme,
  validateTaskId,
  writeArchiveCard,
} from './lib/task-registry.mjs';

function printHelp() {
  console.log(`Usage: yarn task:archive <task-id> [--notes "…"] [--force]

  <task-id>   Поле id из docs/tasks/registry.json (kebab-case).
  --notes     Заметка в карточке архива (PR, итог).
  --force     Переархивировать, если уже archived.
  --help      Эта справка.

Пример:
  yarn task:archive fft-indices-viz --notes "PR #45, plugin merged"`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    return { help: true };
  }
  const force = args.includes('--force');
  const positional = args.filter((a) => !a.startsWith('--') && a !== '-f');
  const id = positional[0];
  let notes = null;
  const notesIdx = args.indexOf('--notes');
  if (notesIdx !== -1 && args[notesIdx + 1]) {
    notes = args[notesIdx + 1];
  }
  return { help: false, id, notes, force };
}

const opts = parseArgs(process.argv);
if (opts.help) {
  printHelp();
  process.exit(opts.id === undefined && process.argv.length <= 3 ? 0 : 0);
}

if (!opts.id) {
  console.error('Укажите <task-id>. См. yarn task:archive --help');
  process.exit(1);
}

try {
  validateTaskId(opts.id);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const registry = loadRegistry();
const task = findTask(registry, opts.id);

if (!task) {
  console.error(`Задача не найдена в реестре: "${opts.id}"`);
  console.error('Добавь запись в docs/tasks/registry.json (status: active).');
  process.exit(1);
}

if (task.status === 'archived' && !opts.force) {
  console.error(`Задача "${opts.id}" уже в архиве (${task.archivedAt}). Используй --force.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
task.status = 'archived';
task.archivedAt = today;
if (opts.notes) {
  task.archiveNotes = opts.notes;
}
if (task.githubIssue != null && task.githubIssueClosedAt === undefined) {
  task.githubIssueClosedAt = null;
}

saveRegistry(registry);
const cardPath = writeArchiveCard(task);
const readmePath = syncTasksReadme(registry);

console.log(`Архивировано: ${opts.id}`);
console.log('Карточка:', cardPath);
console.log('Реестр:', readmePath);
