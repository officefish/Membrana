#!/usr/bin/env node
/**
 * Deploy preflight gate (DR0 deploy-pipeline-refactor).
 *
 * Прод собирается на VPS из `origin/<branch>` (`git reset --hard FETCH_HEAD`),
 * а локальные проверки идут из рабочего дерева. Этот gate сторожит только то,
 * что может создать ложное ожидание «это уедет в прод», хотя сервер соберёт
 * origin/main: локальная грязь ВНУТРИ build context сервиса и расхождение HEAD.
 *
 * Обход (осознанно): `--allow-dirty` / `DEPLOY_ALLOW_DIRTY=1` требует названной
 * причины `--allow-dirty-reason <text>` / `DEPLOY_DIRTY_REASON=<text>`; deploy-run
 * пишет эту причину в журнал прогона.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { IMAGE_SERVICES, copiedLocalBuildSources } from './verify-image-workspace-deps.mjs';

function git(args, { cwd } = {}) {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
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

function normalizeRelPath(path) {
  return String(path ?? '').trim().replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/$/u, '');
}

function statusPath(line) {
  let path = String(line ?? '').slice(3).trim();
  const rename = path.lastIndexOf(' -> ');
  if (rename !== -1) path = path.slice(rename + 4).trim();
  return normalizeRelPath(path.replace(/^"|"$/gu, ''));
}

function pathMatchesContext(path, context) {
  const p = normalizeRelPath(path);
  const c = normalizeRelPath(context);
  if (!p || !c) return false;
  return c === '.' || p === c || p.startsWith(`${c}/`);
}

export function dirtyLinesInBuildContext(dirtyLines, buildContextPaths = null) {
  if (buildContextPaths == null) return dirtyLines;
  return dirtyLines.filter((line) => {
    const path = statusPath(line);
    return buildContextPaths.some((context) => pathMatchesContext(path, context));
  });
}

export function deployBuildContextPaths({ service, cwd, buildContextPaths } = {}) {
  if (Array.isArray(buildContextPaths)) {
    return [...new Set(buildContextPaths.map(normalizeRelPath).filter(Boolean))];
  }
  if (!service) return null;
  const spec = IMAGE_SERVICES.find((s) => s.id === service);
  if (!spec) throw new Error(`deploy-preflight: неизвестный service «${service}» — build context не объявлен`);
  const dockerfile = resolve(cwd ?? process.cwd(), spec.dockerfile);
  if (!existsSync(dockerfile)) throw new Error(`deploy-preflight: нет ${spec.dockerfile}`);
  return [
    ...new Set([
      spec.dockerfile,
      ...copiedLocalBuildSources(readFileSync(dockerfile, 'utf8')),
    ].map(normalizeRelPath).filter(Boolean)),
  ];
}

/**
 * Определить, разрешён ли обход gate.
 * @param {string[]} [argv]
 */
export function isAllowDirty(argv = process.argv.slice(2)) {
  return argv.includes('--allow-dirty') || process.env.DEPLOY_ALLOW_DIRTY === '1';
}

export function allowDirtyReason(argv = process.argv.slice(2), env = process.env) {
  const i = argv.indexOf('--allow-dirty-reason');
  const fromArgv = i !== -1 ? argv[i + 1] : null;
  const reason = String(fromArgv ?? env.DEPLOY_DIRTY_REASON ?? '').trim();
  return reason || null;
}

/**
 * Выполнить preflight-проверку перед деплоем.
 * Печатает диагностику; при найденных проблемах и без обхода вызывает process.exit(1).
 *
 * @param {object} opts
 * @param {string} opts.branch        Ветка, которую деплоим (origin/<branch>).
 * @param {string} [opts.cwd]         Корень репозитория.
 * @param {string} [opts.service]     Сервис из IMAGE_SERVICES; включает scoped dirty по Dockerfile COPY.
 * @param {string[]} [opts.buildContextPaths] Тестовый/явный контекст сборки.
 * @param {boolean} [opts.allowDirty] Разрешить обход (по умолчанию из argv/env).
 * @param {string|null} [opts.allowDirtyReason] Причина обхода.
 * @param {(code:number)=>never} [opts.exit] Выход; параметр ради зубов.
 * @returns {{ clean: boolean, problems: string[], originHead: string | null, dirtyLines: string[], ignoredDirtyLines: string[], buildContextPaths: string[] | null, allowDirtyReason: string | null }}
 */
export function deployPreflight({
  branch,
  cwd,
  service,
  buildContextPaths,
  allowDirty = isAllowDirty(),
  allowDirtyReason: reason = allowDirtyReason(),
  exit = process.exit,
}) {
  const problems = [];
  let originHead = null;

  const inside = tryGit('rev-parse --is-inside-work-tree', { cwd });
  if (!inside.ok || inside.out !== 'true') {
    console.warn('[preflight] не git-репозиторий — пропускаю проверку чистоты дерева');
    return { clean: true, problems, originHead, dirtyLines: [], ignoredDirtyLines: [], buildContextPaths: null, allowDirtyReason: null };
  }

  const contextPaths = deployBuildContextPaths({ service, cwd, buildContextPaths });

  // 1. Грязь только в build context сервиса. Вне контекста локальный файл физически не
  // попадёт в серверную сборку из origin/main, поэтому это не предмет DR0.
  const status = tryGit('status --porcelain', { cwd });
  const allDirtyLines = status.ok ? status.out.split('\n').filter(Boolean) : [];
  const dirtyLines = dirtyLinesInBuildContext(allDirtyLines, contextPaths);
  const ignoredDirtyLines = allDirtyLines.filter((line) => !dirtyLines.includes(line));
  if (dirtyLines.length > 0) {
    const scope = service ? `контекст сборки ${service}` : 'рабочее дерево';
    problems.push(`${scope} содержит ${dirtyLines.length} незакоммиченных/неотслеживаемых изменений`);
  }

  // 2. Локальный HEAD vs origin/<branch> (то, что реально соберётся на VPS).
  const headRes = tryGit('rev-parse HEAD', { cwd });
  const localHead = headRes.ok ? headRes.out : null;
  const fetched = tryGit(`fetch origin ${branch} --quiet`, { cwd });
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
    const ignored = ignoredDirtyLines.length > 0 ? `; вне контекста не блокирует: ${ignoredDirtyLines.length}` : '';
    console.log(`[preflight] OK: build context чист и HEAD совпадает с origin/${branch}${ignored}`);
    return { clean: true, problems, originHead, dirtyLines, ignoredDirtyLines, buildContextPaths: contextPaths, allowDirtyReason: null };
  }

  console.error('\n[preflight] ВНИМАНИЕ — локальное состояние ≠ то, что задеплоится из origin:');
  for (const p of problems) console.error(`  • ${p}`);
  if (dirtyLines.length > 0) {
    console.error('\n  Незакоммиченные/неотслеживаемые файлы ВНУТРИ build context:');
    for (const line of dirtyLines.slice(0, 40)) console.error(`    ${line}`);
    if (dirtyLines.length > 40) console.error(`    … и ещё ${dirtyLines.length - 40}`);
  }
  if (ignoredDirtyLines.length > 0) {
    console.error(`\n  Вне build context найдено ${ignoredDirtyLines.length} изменений — DR0 их не блокирует.`);
  }
  console.error(
    '\n  Прод собирается из origin/' +
      branch +
      ' — локальные изменения в build context НЕ попадут в сборку.\n  Закоммить и запушь их, либо осознанно обойди gate: --allow-dirty-reason "почему" (или DEPLOY_DIRTY_REASON).\n',
  );

  if (allowDirty) {
    if (!reason) {
      console.error('[preflight] обход включён, но причина не названа — отказ. Укажи --allow-dirty-reason или DEPLOY_DIRTY_REASON.\n');
      exit(1);
    }
    console.error(`[preflight] обход включён: ${reason} — продолжаю.\n`);
    return { clean: false, problems, originHead, dirtyLines, ignoredDirtyLines, buildContextPaths: contextPaths, allowDirtyReason: reason };
  }

  exit(1);
}
