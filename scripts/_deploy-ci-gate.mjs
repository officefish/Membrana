#!/usr/bin/env node
/**
 * Deploy CI gate (DR1 deploy-pipeline-refactor).
 *
 * Деплой должен ехать на прод только из коммита, который зелёный в CI.
 * Этот gate по SHA коммита (origin/<branch>, то, что реально соберётся на VPS)
 * читает статус прогонов GitHub Actions через `gh` и блокирует деплой, если
 * обязательный workflow (по умолчанию «CI») не завершился успехом.
 *
 * Обход (осознанно): флаг `--allow-red-ci` в argv или `DEPLOY_ALLOW_RED_CI=1`.
 * Список обязательных workflow можно переопределить через `DEPLOY_CI_WORKFLOWS`
 * (через запятую, по полю workflowName), по умолчанию: "CI".
 */
import { execSync } from 'node:child_process';

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  }).trim();
}

/**
 * @param {string[]} [argv]
 */
export function isAllowRedCi(argv = process.argv.slice(2)) {
  return argv.includes('--allow-red-ci') || process.env.DEPLOY_ALLOW_RED_CI === '1';
}

function requiredWorkflows() {
  const raw = process.env.DEPLOY_CI_WORKFLOWS;
  if (!raw) return ['CI'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function blockOrBypass(message, allowRedCi) {
  console.error(`\n[ci-gate] ${message}`);
  if (allowRedCi) {
    console.error('[ci-gate] обход включён (--allow-red-ci / DEPLOY_ALLOW_RED_CI=1) — продолжаю.\n');
    return { green: false };
  }
  console.error(
    '  Дождись зелёного CI на этом коммите либо осознанно обойди gate: --allow-red-ci (или DEPLOY_ALLOW_RED_CI=1).\n',
  );
  process.exit(1);
}

/**
 * Проверить, что деплоируемый коммит зелёный в CI.
 * Печатает диагностику; при красном/незавершённом CI без обхода — process.exit(1).
 *
 * @param {object} opts
 * @param {string} opts.branch          Деплоируемая ветка.
 * @param {string | null} opts.sha      SHA коммита (origin/<branch>); null → проверка пропускается.
 * @param {boolean} [opts.allowRedCi]   Разрешить обход (по умолчанию из argv/env).
 * @returns {{ green: boolean }}
 */
export function assertCiGreen({ branch, sha, allowRedCi = isAllowRedCi() }) {
  if (!sha) {
    console.warn('[ci-gate] неизвестен SHA origin-коммита — проверка CI пропущена');
    return { green: false };
  }

  const shortSha = sha.slice(0, 8);

  let runsRaw;
  try {
    runsRaw = gh(
      `run list --branch ${branch} --limit 50 --json databaseId,headSha,status,conclusion,workflowName,event,url`,
    );
  } catch {
    return blockOrBypass(
      'gh CLI недоступен или не авторизован — не могу проверить статус CI.',
      allowRedCi,
    );
  }

  let runs;
  try {
    runs = JSON.parse(runsRaw);
  } catch {
    return blockOrBypass('не удалось разобрать ответ gh run list.', allowRedCi);
  }

  const forSha = runs.filter((r) => r.headSha === sha);
  const needed = requiredWorkflows();
  const failures = [];

  for (const wf of needed) {
    // gh возвращает прогоны от новых к старым; берём самый свежий для workflow.
    const run = forSha.find((r) => r.workflowName === wf);
    if (!run) {
      failures.push(`workflow «${wf}» не запускался на коммите ${shortSha}`);
      continue;
    }
    if (run.status !== 'completed') {
      failures.push(`workflow «${wf}» ещё выполняется (status=${run.status}) — ${run.url}`);
      continue;
    }
    if (run.conclusion !== 'success') {
      failures.push(`workflow «${wf}» завершился: ${run.conclusion} — ${run.url}`);
    }
  }

  if (failures.length === 0) {
    console.log(`[ci-gate] OK: CI зелёный на коммите ${shortSha} (${needed.join(', ')})`);
    return { green: true };
  }

  console.error(`\n[ci-gate] ВНИМАНИЕ — CI не подтверждён для коммита ${shortSha} (origin/${branch}):`);
  for (const f of failures) console.error(`  • ${f}`);
  return blockOrBypass('деплой на прод допускается только из зелёного CI.', allowRedCi);
}
