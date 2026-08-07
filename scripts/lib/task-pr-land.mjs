/**
 * task:pr-land — PR с реестром: локальный merge origin/main (union-драйвер) → push → merge.
 *
 * GitHub не запускает `merge.registry-union.driver` (#1026, RT-5 / #515).
 * Серверный CONFLICTING/DIRTY на registry.json часто ложный: локально merge чист.
 */

import { sameSha } from './review-gate.mjs';

/**
 * Свежесть вердикта ревью после локального merge (долг `#pr-land-invalidates-own-review`, #1764).
 *
 * ДЕФЕКТ, КОТОРЫЙ ЧИНИТСЯ. `pr-land` делает `merge origin/main → push → pr:ship --merge-only`.
 * Шаг merge двигает HEAD, а вердикт ревью привязан к SHA — и следующий же шаг падает
 * «вердикт протух». Инструмент подрывал собственный следующий шаг.
 *
 * ПРЕДИКАТ, А НЕ ФЛАГ (разбор Ожегова 07.08). Спрашивается не «был ли merge», а
 * `reviewedSha === headShaAfterMerge`. Флаг вида `--no-review-needed` сюда не заводится
 * сознательно: он подменял бы предикат намерением, а намерению здесь верить нельзя —
 * ровно от этого правило привязки к SHA и защищает.
 *
 * ГРАНИЦА (там же). `pr-land` — оркестратор доставки, НЕ ревьюер: он не зовёт
 * `code-review:pr` сам. Инструмент, выписывающий себе вердикт, ломает несущее правило через
 * чёрный ход. Дело этого предиката — сказать «протух» и назвать команду человеку.
 *
 * @param {{reviewedSha?: string|null, headSha?: string|null}} input
 * @returns {{fresh: boolean, reason: 'fresh'|'no_verdict'|'stale'|'no_head'}}
 */
export function verdictFreshness({ reviewedSha, headSha } = {}) {
  if (!headSha) return { fresh: false, reason: 'no_head' };
  if (!reviewedSha) return { fresh: false, reason: 'no_verdict' };
  return sameSha(reviewedSha, headSha) ? { fresh: true, reason: 'fresh' } : { fresh: false, reason: 'stale' };
}

/**
 * Отказ ГРОМКИЙ и с resume (разбор Ожегова): молчаливый перепрогон означал бы, что инструмент
 * сам решает, чей вердикт годится. Показываем оба SHA, диапазон и точные команды.
 *
 * @returns {string[]} строки для stderr
 */
export function formatVerdictRefusal({ prNumber, reviewedSha, headSha, reason }) {
  const short = (s) => String(s ?? '—').slice(0, 8);
  const head = [
    reason === 'no_verdict'
      ? `task:pr-land: вердикта ревью по PR #${prNumber} нет — мержить нельзя.`
      : `task:pr-land: вердикт протух — смотрели ${short(reviewedSha)}, на ветке ${short(headSha)}.`,
  ];
  if (reason === 'stale') {
    head.push(`  Что изменилось: git diff ${short(reviewedSha)}..${short(headSha)}`);
    head.push('  Причина: локальный merge origin/main сдвинул HEAD — прежний вердикт про другое дерево.');
  }
  head.push(`  resume: yarn code-review:pr ${prNumber}  →  yarn pr:ship --merge-only --execute`);
  head.push('  Ревью НЕ запускается автоматически: pr-land доставляет, вердикт выносит ревьюер.');
  return head;
}

export const REGISTRY_JSON = 'docs/tasks/registry.json';
export const REGISTRY_README = 'docs/tasks/README.md';

/**
 * @param {string[]} paths
 */
export function prTouchesRegistry(paths = []) {
  return paths.some((p) => p === REGISTRY_JSON || p === REGISTRY_README || p.startsWith('docs/tasks/'));
}

/**
 * Подсказка для pr:ship при CONFLICTING/DIRTY на PR с реестром.
 *
 * @param {{touchesRegistry?: boolean, prNumber?: number|string|null}} [ctx]
 */
export function registryMergeLandHint(ctx = {}) {
  if (!ctx.touchesRegistry) return '';
  const n = ctx.prNumber != null && ctx.prNumber !== '' ? ` ${ctx.prNumber}` : '';
  return (
    `\n  PR трогает ${REGISTRY_JSON} — GitHub не видит union-драйвер (локальный только).\n` +
    `  yarn task:pr-land${n}  # git merge origin/main (драйвер) → push → pr:ship --merge-only\n` +
    '  Не править registry.json руками при «конфликте на сервере» — влить базу локально.\n'
  );
}

/**
 * @param {{mergeable?: string|null, mergeStateStatus?: string|null, touchesRegistry?: boolean, prNumber?: number|string|null}} snap
 */
export function assertPrMergeableOrRegistryLand(snap = {}) {
  const mergeable = String(snap.mergeable ?? '').toUpperCase();
  const state = String(snap.mergeStateStatus ?? '').toUpperCase();
  if (mergeable !== 'CONFLICTING' && state !== 'DIRTY') return;
  const branch = snap.branch ? ` (${snap.branch})` : '';
  const hint = registryMergeLandHint(snap);
  throw new Error(
    `pr:ship: PR не mergeable (${mergeable || '?'} / ${state || '?'}). STOP до merge${branch}.${hint}` +
      '  git fetch origin && git rebase origin/main\n' +
      '  # resolve → yarn git:rebase-continue\n' +
      '  git push --force-with-lease\n' +
      '  yarn pr:ship --merge-only --execute',
  );
}

/**
 * @param {typeof import('node:child_process').execFileSync} run
 * @param {number|string} prNumber
 */
export function readPrChangedPaths(run, prNumber) {
  try {
    const raw = run('gh', ['pr', 'view', String(prNumber), '--json', 'files'], { encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    return files.map((f) => String(f.path ?? f));
  } catch {
    return [];
  }
}

/**
 * @param {typeof import('node:child_process').execFileSync} run
 * @param {number|string|null} [prNumber]
 */
export function readPrHeadBranch(run, prNumber = null) {
  const ref = prNumber != null && prNumber !== '' ? String(prNumber) : null;
  const args = ref
    ? ['pr', 'view', ref, '--json', 'headRefName,number,mergeable,mergeStateStatus']
    : ['pr', 'view', '--json', 'headRefName,number,mergeable,mergeStateStatus'];
  const raw = run('gh', args, { encoding: 'utf8' });
  const parsed = JSON.parse(raw);
  return {
    branch: parsed.headRefName ?? null,
    number: parsed.number ?? (ref ? Number(ref) : null),
    mergeable: parsed.mergeable ?? null,
    mergeStateStatus: parsed.mergeStateStatus ?? null,
  };
}

/**
 * План task:pr-land — чистая логика для CLI и тестов.
 *
 * @param {{
 *   prNumber: number|string,
 *   branch?: string|null,
 *   currentBranch?: string|null,
 *   base?: string,
 *   execute?: boolean,
 *   merge?: boolean,
 *   wait?: boolean,
 * }} opts
 */
/** Прямой node-вход `pr:ship` — минуя yarn (см. `shipMergeStep`). */
export const PR_SHIP_ENTRY = 'scripts/pr-ship.mjs';

/**
 * Шаг мерджа без участия yarn.
 *
 * 26.07 (#1261) этот шаг дважды не выполнился на Windows: сначала `spawnSync yarn ENOENT`
 * (PR #1256), затем — после «фикса» на `yarn.cmd` — `spawnSync yarn.cmd EINVAL` (PR #1269).
 * Причина второго: Node с 18.20/20.12 отказывается запускать `.cmd`/`.bat` без `shell:true`
 * (защита от CVE-2024-27980). Правильный вывод: не чинить имя шима, а не звать его —
 * `pr:ship` это обычный node-скрипт, и запуск через `process.execPath` не зависит ни от
 * платформы, ни от shell, ни от PATH.
 *
 * @param {{ wait?: boolean, execute?: boolean, nodeBin?: string }} [opts]
 * @returns {{ label: string, cmd: string, args: string[] }}
 */
export function shipMergeStep(opts = {}) {
  const wait = opts.wait !== false;
  return {
    label: 'ship-merge',
    cmd: opts.nodeBin ?? process.execPath,
    args: [
      PR_SHIP_ENTRY,
      '--merge-only',
      ...(wait ? [] : ['--no-wait']),
      ...(opts.execute ? ['--execute'] : []),
    ],
  };
}

export function planPrLand(opts) {
  const base = opts.base ?? 'main';
  const branch = opts.branch ?? opts.currentBranch ?? null;
  const wait = opts.wait !== false;
  /** @type {{label: string, cmd: string, args: string[], note?: string}[]} */
  const steps = [
    { label: 'fetch-main', cmd: 'git', args: ['fetch', 'origin', base] },
    {
      label: 'merge-main',
      cmd: 'git',
      args: ['merge', `origin/${base}`],
      note: 'без -m: commit-msg хук пропускает Merge branch …; union-драйвер сливает registry',
    },
    { label: 'push', cmd: 'git', args: ['push'] },
    {
      label: 'verdict-freshness',
      kind: 'gate',
      note: 'вердикт ревью обязан относиться к HEAD ПОСЛЕ merge; протух — стоп с resume, ревью не зовём сами',
    },
    shipMergeStep({ wait, execute: opts.execute, nodeBin: opts.nodeBin }),
  ];
  return {
    prNumber: opts.prNumber,
    branch,
    base,
    steps,
    preflight: branch && opts.currentBranch && branch !== opts.currentBranch
      ? `checkout ${branch} (сейчас ${opts.currentBranch})`
      : null,
  };
}

/**
 * @param {string[]} argv
 */
export function parsePrLandArgs(argv) {
  /** @type {{help: boolean, execute: boolean, noWait: boolean, prNumber: string|null, base: string}} */
  const out = { help: false, execute: false, noWait: false, prNumber: null, base: 'main' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--execute') out.execute = true;
    else if (a === '--no-wait') out.noWait = true;
    else if (a === '--base') out.base = argv[++i] ?? 'main';
    else if (a.startsWith('--base=')) out.base = a.slice(7) || 'main';
    else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else if (!out.prNumber) out.prNumber = a;
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}
