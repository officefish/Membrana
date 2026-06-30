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
  listPendingGithubClose,
  loadRegistry,
  markArchiveGithubIssueClosed,
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

if (pending.length === 0) {
  console.log('Очередь пуста: нет архивных задач с открытым GitHub Issue.');
  process.exit(0);
}

console.log(`Очередь закрытия GitHub (${pending.length}):`);
for (const t of pending) {
  console.log(`  • ${t.id} → #${t.githubIssue}`);
}

if (opts.dryRun) {
  console.log('\n--dry-run: gh не вызывается.');
  process.exit(0);
}

if (!hasGh()) {
  console.error('\ngh CLI не найден. Установите GitHub CLI и выполните gh auth login.');
  console.error('Либо закройте Issues вручную по карточкам в docs/tasks/archive/.');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
let ok = 0;
let fail = 0;

for (const task of pending) {
  const cardPath = archiveCardPath(task);
  if (!existsSync(cardPath)) {
    console.error(`\n[${task.id}] нет карточки: ${cardPath}`);
    fail++;
    continue;
  }

  const body = extractGithubIssueReport(readFileSync(cardPath, 'utf8'));
  const issue = task.githubIssue;

  console.log(`\n[${task.id}] Issue #${issue}…`);
  try {
    ghIssueComment(issue, body);
    ghIssueClose(issue);
    task.githubIssueClosedAt = today;
    markArchiveGithubIssueClosed(task.id, today);
    ok++;
    console.log(`  OK`);
  } catch (err) {
    console.error(`  Ошибка:`, err.message ?? err);
    fail++;
  }
}

saveRegistry(registry);
console.log(`\nГотово: ${ok} закрыто, ${fail} ошибок. registry.json обновлён.`);

process.exit(fail > 0 ? 1 : 0);
