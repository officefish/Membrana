/**
 * Вечернее закрытие GitHub Issues по очереди из реестра.
 *
 * Берёт задачи: status=archived, githubIssue задан, githubIssueClosedAt=null.
 * Текст отчёта — из docs/tasks/archive/<id>.md (раздел «Отчёт о выполнении»).
 *
 *   yarn task:close-github           — комментарий + close через gh
 *   yarn task:close-github --dry-run — только список и превью
 *
 * Требуется: gh auth login. Прокси — как в morning-care (HTTPS_PROXY из .env).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
import {
  archiveCardPath,
  extractGithubIssueReport,
  findEpicIssueCollisions,
  listPendingGithubClose,
  loadRegistry,
  saveRegistry,
} from './lib/task-registry.mjs';

const REPO = 'officefish/Membrana';

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const help = argv.includes('--help') || argv.includes('-h');
  return { dryRun, help };
}

function hasGh() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function ghIssueComment(issueNumber, body) {
  execFileSync(
    'gh',
    ['issue', 'comment', String(issueNumber), '--repo', REPO, '--body', body],
    { stdio: 'inherit', encoding: 'utf8' },
  );
}

function ghIssueClose(issueNumber) {
  execFileSync(
    'gh',
    [
      'issue',
      'close',
      String(issueNumber),
      '--repo',
      REPO,
      '--comment',
      'Закрыто по реестру задач (`yarn task:close-github`).',
    ],
    { stdio: 'inherit', encoding: 'utf8' },
  );
}

const opts = parseArgs(process.argv);
if (opts.help) {
  console.log(`Usage: yarn task:close-github [--dry-run]

  Закрывает Issues для архивных задач, у которых в registry.json
  поле githubIssueClosedAt ещё null.

  Перед запуском: yarn task:archive <id> и отчёт в docs/tasks/archive/<id>.md`);
  process.exit(0);
}

loadDotEnv(repoRoot);

const registry = loadRegistry();
const pending = listPendingGithubClose(registry);

// Ретро #485 п.5: фаза с githubIssue эпика закрыла бы Issue ВСЕГО эпика. Такие
// задачи в очередь не попадают (listPendingGithubClose) — но молчать о них нельзя,
// иначе поле так и останется битым и всплывёт на следующем эпике.
const blocked = findEpicIssueCollisions(registry).filter(
  (t) => t.status === 'archived' && !t.githubIssueClosedAt,
);
if (blocked.length > 0) {
  console.warn(`\n⚠ Не закрываю ${blocked.length}: фаза носит githubIssue своего эпика.`);
  console.warn('  Закрытие оборвало бы весь эпик, а не фазу. Почините поле в registry.json:');
  console.warn('  githubIssue фазы → null (если своего Issue нет) либо номер СВОЕГО Issue.');
  const byEpic = new Map();
  for (const t of blocked) {
    if (!byEpic.has(t.parentEpic)) byEpic.set(t.parentEpic, []);
    byEpic.get(t.parentEpic).push(t.id);
  }
  for (const [epic, ids] of byEpic) {
    console.warn(`    • эпик ${epic} (#${registry.tasks.find((t) => t.id === epic)?.githubIssue}): ${ids.join(', ')}`);
  }
  console.warn('');
}

if (pending.length === 0) {
  console.log('Очередь пуста: нет архивных задач с открытым GitHub Issue.');
  process.exit(0);
}

console.log(`Очередь закрытия GitHub (${pending.length}):`);
for (const t of pending) {
  console.log(`  • ${t.id} → #${t.githubIssue}`);
}

if (opts.dryRun) {
  // NB4: показать, у каких задач нет archive-карточки — они будут пропущены (не ошибка).
  const missing = pending.filter((t) => !existsSync(archiveCardPath(t)));
  if (missing.length > 0) {
    console.log(`\nБез archive-карточки (будут ПРОПУЩЕНЫ, не ошибка): ${missing.length}`);
    for (const t of missing) console.log(`  ⚠ ${t.id}`);
  }
  console.log('\n--dry-run: gh не вызывается.');
  process.exit(0);
}

if (!hasGh()) {
  console.error('\ngh CLI не найден. Установите GitHub CLI и выполните gh auth login.');
  console.error('Либо закройте Issues вручную по карточкам в docs/tasks/archive/.');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const strict = process.argv.includes('--strict');
let ok = 0;
let fail = 0;
let skipped = 0;

for (const task of pending) {
  const cardPath = archiveCardPath(task);
  if (!existsSync(cardPath)) {
    // NB4 (tooling-retro): отсутствие archive-карточки у старых задач — не hard-fail,
    // а skip с варнингом, чтобы не рвать вечерний ритуал. --strict вернёт старое поведение.
    console.warn(`\n[${task.id}] SKIP: нет карточки ${cardPath} (старая задача до генерации карточек)`);
    skipped++;
    continue;
  }

  const body = extractGithubIssueReport(readFileSync(cardPath, 'utf8'));
  const issue = task.githubIssue;

  console.log(`\n[${task.id}] Issue #${issue}…`);
  try {
    ghIssueComment(issue, body);
    ghIssueClose(issue);
    task.githubIssueClosedAt = today;
    ok++;
    console.log(`  OK`);
  } catch (err) {
    console.error(`  Ошибка:`, err.message ?? err);
    fail++;
  }
}

saveRegistry(registry);
console.log(
  `\nГотово: ${ok} закрыто, ${fail} ошибок, ${skipped} пропущено (нет карточки). registry.json обновлён.`,
);
if (skipped > 0) {
  console.log(
    `  ${skipped} задач без archive-карточки пропущены (не ошибка). ` +
      `Для чистки: сгенерировать карточки или архивировать вручную. --strict — падать на пропусках.`,
  );
}

// Skip (нет карточки) — не hard-fail (не рвёт ритуал). Реальные gh-ошибки — fail.
// --strict возвращает старое поведение (падать и на пропусках).
process.exit(fail > 0 || (strict && skipped > 0) ? 1 : 0);
