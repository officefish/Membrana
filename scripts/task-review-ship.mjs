#!/usr/bin/env node
/**
 * task:review:ship (#469 ti-1): one-shot закрытия задачи после squash-мёржа.
 * ОБЁРТКА над lib/task-closure-review.mjs — инварианты runner'а (immutable
 * per-SHA артефакт, fail-closed evidence) НЕ ослабляются, автоматизируется
 * только хореография вокруг них (консилиум agent-tooling-friction-2).
 *
 * Хореография (каждый шаг печатается ДО выполнения):
 *   1. gh pr view N → точный squash-SHA (mergeCommit.oid). Нет mergeCommit →
 *      СТОП до любых действий с worktree (fail-closed).
 *   2. base = родитель mergeCommit (git show %P) — НЕ «HEAD перед pull».
 *   3. main ушёл вперёд → чеки на detached checkout mergeCommit, возврат на main.
 *   4. prepare → run (--check … [--review-file]) → finalize → bookkeeping-commit
 *      (rebase-retry при отказе push).
 *
 * Usage:
 *   yarn task:review:ship --id <task-id> --pr N [--check "cmd"]... [--review-file <md>] [--execute]
 *   (по умолчанию dry-run: печатает план, ничего не делает; --execute — реально)
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Разбор аргументов ship. Экспорт ради тестов. */
export function parseShipArgs(argv) {
  const out = { checks: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') { out.execute = true; continue; }
    if (a === '--check') { out.checks.push(argv[++i] ?? ''); continue; }
    if (a === '--id') { out.id = argv[++i]; continue; }
    if (a.startsWith('--id=')) { out.id = a.slice(5); continue; }
    if (a === '--pr') { out.pr = argv[++i]; continue; }
    if (a.startsWith('--pr=')) { out.pr = a.slice(5); continue; }
    if (a === '--review-file') { out.reviewFile = argv[++i]; continue; }
    if (a.startsWith('--review-file=')) { out.reviewFile = a.slice(14); continue; }
  }
  return out;
}

/**
 * Извлечь squash-SHA из `gh pr view --json state,mergeCommit`.
 * Fail-closed: PR не смёржен ИЛИ нет mergeCommit.oid → бросаем (не угадываем).
 */
export function extractSquashSha(ghView) {
  if (ghView?.state !== 'MERGED') {
    throw new Error(`PR не смёржен (state=${ghView?.state ?? '?'}) — ship останавливается до действий с worktree.`);
  }
  const sha = ghView?.mergeCommit?.oid;
  if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error('gh не отдал mergeCommit.oid (API мигает?) — повтори через минуту; SHA не угадываем.');
  }
  return sha;
}

/**
 * План хореографии — список человекочитаемых шагов (печатается и тестируется).
 * detached=true, когда HEAD ≠ squash-SHA (main ушёл вперёд после мёржа).
 */
export function shipSteps({ id, pr, sha, base, headSha, checks, reviewFile }) {
  const detached = headSha !== sha;
  const short = (s) => s.slice(0, 12);
  return {
    detached,
    steps: [
      `1. gh pr view #${pr} → squash-SHA ${short(sha)} (смёржен)`,
      `2. база = родитель ${short(sha)} = ${short(base)}`,
      detached
        ? `3. main ушёл вперёд (HEAD ${short(headSha)} ≠ ${short(sha)}) → чеки на detached checkout ${short(sha)}, возврат на main`
        : `3. HEAD = squash-SHA — detached checkout не нужен`,
      `4. prepare --id ${id} --ref ${short(sha)} --base ${short(base)} --pr ${pr}`,
      `5. run --check (${checks.length}) ${reviewFile ? '+ --review-file' : '(LLM-ревью)'}`,
      `6. finalize --id ${id}`,
      `7. bookkeeping-commit (rebase-retry при отказе push)`,
    ],
  };
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

const isMain = process.argv[1]?.endsWith('task-review-ship.mjs');
if (isMain) {
  const cli = parseShipArgs(process.argv.slice(2));
  if (!cli.id || !cli.pr) {
    console.error('Usage: yarn task:review:ship --id <task-id> --pr N [--check "cmd"]… [--review-file <md>] [--execute]');
    process.exit(1);
  }

  // Шаг 1 — fail-closed до любых действий.
  let sha;
  try {
    const ghView = JSON.parse(sh(`gh pr view ${cli.pr} --json state,mergeCommit`));
    sha = extractSquashSha(ghView);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const base = sh(`git show -s --format=%P ${sha}`).split(/\s+/)[0];
  const headSha = sh('git rev-parse HEAD');
  const plan = shipSteps({ id: cli.id, pr: cli.pr, sha, base, headSha, checks: cli.checks, reviewFile: cli.reviewFile });

  console.log('План хореографии ship:');
  for (const s of plan.steps) console.log(`  ${s}`);

  if (!cli.execute) {
    console.log('\n(dry-run — ничего не сделано. Добавь --execute для реального прогона.)');
    process.exit(0);
  }

  const run = (cmd) => {
    console.log(`\n→ ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit' });
  };
  const originalBranch = sh('git rev-parse --abbrev-ref HEAD');
  try {
    run(`yarn task:review:prepare --id ${cli.id} --ref ${sha} --base ${base} --pr ${cli.pr}`);
    if (plan.detached) {
      console.log(`\n→ git checkout ${sha.slice(0, 12)} (detached, для чеков на exact SHA)`);
      sh(`git checkout ${sha}`);
    }
    const checkArgs = cli.checks.map((c) => `--check "${c.replace(/"/g, '\\"')}"`).join(' ');
    const reviewArg = cli.reviewFile ? `--review-file "${cli.reviewFile}"` : '';
    run(`yarn task:review:run --id ${cli.id} ${checkArgs} ${reviewArg}`.trim());
    if (plan.detached) {
      console.log(`\n→ git checkout ${originalBranch} (возврат)`);
      sh(`git checkout ${originalBranch}`);
    }
    run(`yarn task:review:finalize --id ${cli.id}`);

    // bookkeeping
    console.log('\n→ bookkeeping-commit');
    sh('git add docs/tasks/registry.json docs/tasks/README.md docs/reviews');
    sh(`git commit -m "chore(tasks): архив ${cli.id} — closure ship ${sha.slice(0, 12)}"`);
    try {
      sh('git push');
    } catch {
      console.log('→ push отклонён, git pull --rebase + повтор');
      sh('git pull --rebase');
      sh('git push');
    }
    console.log(`\nship OK: ${cli.id} закрыт на ${sha.slice(0, 12)}.`);
  } catch (e) {
    // Вернуться на исходную ветку, если застряли в detached
    try {
      if (sh('git rev-parse --abbrev-ref HEAD') === 'HEAD') sh(`git checkout ${originalBranch}`);
    } catch { /* ignore */ }
    console.error(`\nship остановлен: ${e?.message ?? e}\nДокати вручную с шага, на котором встал (план выше).`);
    process.exit(1);
  }
}
