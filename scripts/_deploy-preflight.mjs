#!/usr/bin/env node
/**
 * Deploy preflight gate (DR0 deploy-pipeline-refactor).
 *
 * Прод собирается на VPS из `origin/<branch>` (`git reset --hard FETCH_HEAD`),
 * а локальные проверки идут из рабочего дерева. Это расхождение источников
 * истины уронило прод-сборку MP7b (незакоммиченные зависимости).
 *
 * Этот gate перед коннектом к VPS предупреждает/блокирует, если локальное
 * состояние не совпадает с тем, что реально задеплоится из origin:
 *   1) рабочее дерево «грязное» (незакоммиченные/untracked файлы);
 *   2) локальный HEAD расходится с `origin/<branch>` (незапушенные коммиты
 *      или origin впереди).
 *
 * Обход (осознанно): флаг `--allow-dirty` в argv или `DEPLOY_ALLOW_DIRTY=1`.
 */
import { execSync } from 'node:child_process';

function git(args, { cwd } = {}) {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    // Неинтерактивно: git не должен зависать на запросе логина/пароля.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    timeout: 20000,
  }).trim();
}

function tryGit(args, opts) {
  try {
    return { ok: true, out: git(args, opts) };
  } catch (err) {
    return { ok: false, out: '', err };
  }
}

/**
 * Определить, разрешён ли обход gate.
 * @param {string[]} [argv]
 */
export function isAllowDirty(argv = process.argv.slice(2)) {
  return argv.includes('--allow-dirty') || process.env.DEPLOY_ALLOW_DIRTY === '1';
}

/**
 * Выполнить preflight-проверку перед деплоем.
 * Печатает диагностику; при найденных проблемах и без обхода вызывает process.exit(1).
 *
 * @param {object} opts
 * @param {string} opts.branch        Ветка, которую деплоим (origin/<branch>).
 * @param {string} [opts.cwd]         Корень репозитория.
 * @param {boolean} [opts.allowDirty] Разрешить обход (по умолчанию из argv/env).
 * @returns {{ clean: boolean, problems: string[] }}
 */
export function deployPreflight({ branch, cwd, allowDirty = isAllowDirty() }) {
  const problems = [];

  const inside = tryGit('rev-parse --is-inside-work-tree', { cwd });
  if (!inside.ok || inside.out !== 'true') {
    console.warn('[preflight] не git-репозиторий — пропускаю проверку чистоты дерева');
    return { clean: true, problems };
  }

  // 1. Грязное рабочее дерево (модифицированные/staged/untracked).
  const status = tryGit('status --porcelain', { cwd });
  const dirtyLines = status.ok ? status.out.split('\n').filter(Boolean) : [];
  if (dirtyLines.length > 0) {
    problems.push(
      `рабочее дерево содержит ${dirtyLines.length} незакоммиченных/неотслеживаемых изменений`,
    );
  }

  // 2. Локальный HEAD vs origin/<branch> (то, что реально соберётся на VPS).
  //    Best-effort: фетчим тихо; при отсутствии сети — только предупреждение.
  const headRes = tryGit('rev-parse HEAD', { cwd });
  const localHead = headRes.ok ? headRes.out : null;
  const fetched = tryGit(`fetch origin ${branch} --quiet`, { cwd });
  let originHead = null;
  if (fetched.ok) {
    const originRes = tryGit('rev-parse FETCH_HEAD', { cwd });
    originHead = originRes.ok ? originRes.out : null;
  } else {
    console.warn(
      `[preflight] не удалось fetch origin ${branch} (нет сети?) — сравнение с origin пропущено`,
    );
  }
  if (localHead && originHead && localHead !== originHead) {
    const ahead = tryGit(`rev-list --count ${originHead}..${localHead}`, { cwd });
    const behind = tryGit(`rev-list --count ${localHead}..${originHead}`, { cwd });
    const aheadN = ahead.ok ? ahead.out : '?';
    const behindN = behind.ok ? behind.out : '?';
    problems.push(
      `локальный HEAD расходится с origin/${branch}: впереди на ${aheadN}, позади на ${behindN} коммит(ов) — задеплоится версия из origin`,
    );
  }

  if (problems.length === 0) {
    console.log(`[preflight] OK: рабочее дерево чистое и совпадает с origin/${branch}`);
    return { clean: true, problems };
  }

  console.error('\n[preflight] ВНИМАНИЕ — локальное состояние ≠ то, что задеплоится из origin:');
  for (const p of problems) console.error(`  • ${p}`);
  if (dirtyLines.length > 0) {
    console.error('\n  Незакоммиченные/неотслеживаемые файлы:');
    for (const line of dirtyLines.slice(0, 40)) console.error(`    ${line}`);
    if (dirtyLines.length > 40) console.error(`    … и ещё ${dirtyLines.length - 40}`);
  }
  console.error(
    '\n  Прод собирается из origin/' +
      branch +
      ' — локальные изменения НЕ попадут в сборку.\n  Закоммить и запушь их, либо осознанно обойди gate: --allow-dirty (или DEPLOY_ALLOW_DIRTY=1).\n',
  );

  if (allowDirty) {
    console.error('[preflight] обход включён (--allow-dirty / DEPLOY_ALLOW_DIRTY=1) — продолжаю.\n');
    return { clean: false, problems };
  }

  process.exit(1);
}
