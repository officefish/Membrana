#!/usr/bin/env node
/**
 * pr:recreate — пересобрать устаревший PR чистой веткой от свежего base (friction-5 · #1167).
 *
 * Зачем: force-push закрыт политикой (deny-лист), а `git merge origin/main` в отставшую на
 * сотни коммитов ветку стейджит весь catch-up и ловит ЛОЖНЫЙ gitleaks (`protect --staged`
 * флагует контент, уже в main; реальная проверка — `gitleaks detect --log-opts=<range>`).
 * За сессию 2026-07-24 так руками пересобирались #517, #894, #1176.
 *
 * Что делает: берёт net-дельту PR (файлы, изменённые веткой относительно её merge-base),
 * и переносит на новую ветку от origin/<base> ПОФАЙЛОВО:
 *   • main НЕ трогал файл после базы (0 коммитов) → безопасно берём версию ветки;
 *   • main трогал → 3-way нужен, файл помечается MANUAL (не переносим молча);
 *   • --drop <path> → отбрасываем (протухшее: ритуальные строки, sent-log и т.п.).
 * Дерево оставляется подготовленным (safe-файлы staged) — ревью и ship делает человек.
 *
 *   yarn pr:recreate <N> [--drop <path>]... [--branch <name>] [--base main]
 *
 * Exit: 0 — ветка подготовлена (даже если есть MANUAL — они названы); 4 — usage/gh/git.
 */
import { execFileSync } from 'node:child_process';

/**
 * Чистый план переноса (тестируется без git).
 * @param {{ files: {path: string, status: string}[], drops?: string[], divergedByFile?: Record<string, number> }} input
 * @returns {{ port: string[], drop: string[], manual: {path: string, reason: string}[], del: string[] }}
 */
export function planRecreate({ files = [], drops = [], divergedByFile = {} } = {}) {
  const dropSet = new Set(drops);
  const port = [];
  const del = [];
  const drop = [];
  const manual = [];
  for (const f of files) {
    if (dropSet.has(f.path)) {
      drop.push(f.path);
      continue;
    }
    if ((divergedByFile[f.path] ?? 0) > 0) {
      manual.push({ path: f.path, reason: `main изменил файл после базы ветки (нужен 3-way)` });
      continue;
    }
    if (f.status === 'D') del.push(f.path);
    else port.push(f.path); // A | M | R (переименование как A новой версии)
  }
  return { port, drop, manual, del };
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = { pr: null, drops: [], branch: null, base: 'main' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--drop') o.drops.push(argv[(i += 1)]);
    else if (a === '--branch') o.branch = argv[(i += 1)];
    else if (a === '--base') o.base = argv[(i += 1)];
    else if (/^\d+$/u.test(a)) o.pr = a;
  }
  return o;
}

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();

export function main(argv = process.argv) {
  const { pr, drops, branch, base } = parseArgs(argv);
  if (!pr) {
    console.error('Usage: yarn pr:recreate <N> [--drop <path>]... [--branch <name>] [--base main]');
    return 4;
  }
  let head, headBranch;
  try {
    const raw = execFileSync('gh', ['pr', 'view', pr, '--json', 'headRefName,headRefOid,baseRefName'], { encoding: 'utf8' });
    const p = JSON.parse(raw);
    head = p.headRefOid;
    headBranch = p.headRefName;
  } catch (e) {
    console.error(`pr:recreate: не удалось прочитать PR #${pr} (${String(e.message ?? e).split('\n')[0]})`);
    return 4;
  }
  try {
    git(['fetch', 'origin', base]);
    execFileSync('git', ['fetch', 'origin', headBranch], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    /* fetch best-effort — head-oid уже локально или получен gh */
  }
  let mergeBase;
  try {
    mergeBase = git(['merge-base', head, `origin/${base}`]);
  } catch (e) {
    console.error(`pr:recreate: нет общей базы head↔origin/${base} (${String(e.message ?? e).split('\n')[0]})`);
    return 4;
  }
  const files = git(['diff', '--name-status', mergeBase, head])
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((l) => {
      const [status, ...rest] = l.split(/\t/u);
      return { status: status[0], path: rest[rest.length - 1] };
    });
  const divergedByFile = {};
  for (const f of files) {
    const log = git(['log', '--oneline', `${mergeBase}..origin/${base}`, '--', f.path]);
    divergedByFile[f.path] = log ? log.split(/\r?\n/u).filter(Boolean).length : 0;
  }
  const plan = planRecreate({ files, drops, divergedByFile });

  const newBranch = branch ?? `recreate/pr-${pr}`;
  try {
    git(['checkout', '-b', newBranch, `origin/${base}`]);
  } catch (e) {
    console.error(`pr:recreate: не удалось создать ветку ${newBranch} (${String(e.message ?? e).split('\n')[0]})`);
    return 4;
  }
  for (const path of plan.port) git(['checkout', head, '--', path]);
  for (const path of plan.del) git(['rm', '--quiet', '--', path]);

  console.log(`pr:recreate: ветка ${newBranch} от origin/${base} (пересборка #${pr})`);
  console.log(`  ✓ перенесено (${plan.port.length}): ${plan.port.join(', ') || '—'}`);
  if (plan.del.length) console.log(`  ✓ удалено (${plan.del.length}): ${plan.del.join(', ')}`);
  if (plan.drop.length) console.log(`  ⊘ отброшено --drop (${plan.drop.length}): ${plan.drop.join(', ')}`);
  if (plan.manual.length) {
    console.log(`  ⚠ РУЧНОЙ 3-way (${plan.manual.length}) — main разошёлся, перенести осознанно:`);
    for (const m of plan.manual) console.log(`      ${m.path} — ${m.reason}`);
  }
  console.log(`  → дальше: ревью staged + yarn pr:ship (старый #${pr} закрыть как superseded)`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('pr-recreate.mjs')) {
  process.exit(main());
}
