#!/usr/bin/env node
/**
 * yarn tasks:sync-issues — записать в реестр состояние закрытия иссью с GitHub.
 *
 * ЗАЧЕМ (#620). Поле `githubIssueClosedAt` было объявлено в схеме карточки, но на 18.07
 * заполнено у 0 из 39 active-карточек с иссью. Причина не «рассинхрон», а отсутствие
 * писателя: `task-close-github-issues.mjs` ставит поле ТОЛЬКО тем карточкам, которые
 * закрывает сам (`status=archived`). Иссью, закрытая на GitHub руками или чужим PR, в
 * реестре не отражалась никогда.
 *
 * Следствие, ради которого это чинится: `yarn tasks:audit` вынужден ходить в сеть на
 * каждый прогон, поэтому его результат зависит от момента вызова, а не от содержимого
 * коммита — прямое нарушение вердикта DA1 (`audit(x) = audit(x)` бит-в-бит).
 *
 * ПРИНЦИП: объявленное, но незаполняемое поле хуже отсутствующего — оно обещает
 * воспроизводимость, которой нет.
 *
 * Пишет ДВА поля: дату закрытия и `githubIssueStateReason` — последний различает
 * «сделано» (COMPLETED) и «отменено» (NOT_PLANNED), что обязательно по вердикту H1:
 * архив у них один, а история разная.
 *
 * ГРАНИЦА: скрипт синхронизирует ФАКТ закрытия иссью и ничего не архивирует. «Иссью
 * закрыта» остаётся гипотезой о карточке (живой случай #47), вердикт — за человеком
 * через `yarn task:archive <id>`.
 */
import { execFileSync } from 'node:child_process';

import { planIssueStateSync } from './lib/tasks-audit.mjs';
import { loadRegistry, saveRegistry } from './lib/task-registry.mjs';

const DRY = process.argv.includes('--dry-run');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`yarn tasks:sync-issues [--dry-run]

  Проставляет githubIssueClosedAt + githubIssueStateReason по состоянию иссью на GitHub.
  Нужен gh. После прогона \`yarn tasks:audit --offline\` считается без сети.

  Ничего не архивирует — только синхронизирует факт закрытия (#620).`);
  process.exit(0);
}

/** Состояния иссью из gh одним запросом (тот же вызов, что в tasks:audit). */
function fetchIssues() {
  const raw = execFileSync(
    'gh',
    ['issue', 'list', '--state', 'all', '--limit', '600', '--json', 'number,state,stateReason,closedAt'],
    { encoding: 'utf8' },
  );
  return new Map(JSON.parse(raw).map((i) => [i.number, i]));
}

const registry = loadRegistry();
let issues;
try {
  issues = fetchIssues();
} catch (e) {
  console.error(`gh недоступен — синхронизация невозможна: ${e.message.split('\n')[0]}`);
  console.error('Это не «всё синхронно»: без сети состояние закрытия неизвестно.');
  process.exit(1);
}

// Решение — в чистой `planIssueStateSync` (lib/tasks-audit.mjs), здесь только запись.
const { updates } = planIssueStateSync(registry.tasks, issues);
const changed = updates.filter((u) => u.kind === 'closed');
const reopened = updates.filter((u) => u.kind === 'reopened');

for (const u of changed) {
  const back = u.task.githubIssueClosedAt != null && u.closedAt != null && u.closedAt < u.task.githubIssueClosedAt;
  // Сдвиг назад называем вслух: это исправление даты прогона на реальный closedAt,
  // и оно должно быть видно глазами, а не проезжать молча в общем потоке строк.
  const mark = back ? ` (было ${u.task.githubIssueClosedAt} — дата прогона, исправляется на реальную)` : '';
  console.log(`  + ${u.task.id} (#${u.task.githubIssue}) → ${u.closedAt} / ${u.stateReason}${mark}`);
}
for (const u of reopened) console.log(`  - ${u.task.id} (#${u.task.githubIssue}) — иссью снова OPEN, дата снята`);

if (!DRY) {
  for (const u of updates) {
    u.task.githubIssueClosedAt = u.closedAt;
    u.task.githubIssueStateReason = u.stateReason;
  }
  if (updates.length > 0) saveRegistry(registry);
}

const withIssue = registry.tasks.filter((t) => Number(t.githubIssue) > 0).length;
const filled = registry.tasks.filter((t) => t.githubIssueClosedAt != null).length;
console.log(
  `\n${DRY ? '[dry-run] ' : ''}обновлено: ${changed.length}, переоткрыто: ${reopened.length}. ` +
    `githubIssueClosedAt заполнен у ${filled} из ${withIssue} карточек с иссью.`,
);
console.log('Остальные — иссью ещё открыты (это норма, а не пропуск синхронизации).');
