#!/usr/bin/env node
/**
 * pr:verify — ассерт, что PR ДЕЙСТВИТЕЛЬНО смёржен (agent-tooling-friction-5 · #1166).
 *
 * Закрывает «exit 0 ≠ merged»: за сессию 2026-07-24 факт мерджа приходилось проверять
 * руками (`git fetch + gh pr view --json state,mergeCommit + git cat-file`) ~6 раз, потому
 * что pipe `… | tail` маскирует exit-код, а поздний optional-шаг мог оставить PR OPEN.
 *
 * Проверяет: state == MERGED ∧ mergeCommit != null [∧ файл присутствует в origin/<base>].
 *
 *   yarn pr:verify [N] [--file <path>] [--base main]
 *   Без номера — PR текущей ветки (gh pr view без аргумента).
 *
 * Exit: 0 — подтверждено смёржено; 1 — НЕ смёржено / файла нет; 4 — usage/gh/git ошибка.
 */
import { execFileSync } from 'node:child_process';

/**
 * Чистый вердикт по собранным фактам (тестируется без сети).
 * @param {{state?: string, mergeCommit?: string|null, file?: string|null, fileInBase?: boolean|null, base?: string}} facts
 * @returns {{ok: boolean, reasons: string[]}}
 */
export function assessMerge(facts = {}) {
  const state = String(facts.state ?? '').toUpperCase();
  const reasons = [];
  if (state !== 'MERGED') reasons.push(`state=${state || '?'} (ожидалось MERGED)`);
  if (!facts.mergeCommit) reasons.push('mergeCommit отсутствует (merge не состоялся)');
  if (facts.file) {
    if (facts.fileInBase === false) reasons.push(`файл «${facts.file}» НЕ найден в origin/${facts.base ?? 'main'}`);
    else if (facts.fileInBase == null) reasons.push(`не удалось проверить файл «${facts.file}»`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = { pr: null, file: null, base: 'main' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') o.file = argv[(i += 1)];
    else if (a === '--base') o.base = argv[(i += 1)];
    else if (/^\d+$/u.test(a)) o.pr = a;
  }
  return o;
}

function ghPrJson(pr) {
  const args = ['pr', 'view', '--json', 'state,mergeCommit'];
  if (pr) args.splice(2, 0, pr);
  const raw = execFileSync('gh', args, { encoding: 'utf8' });
  const p = JSON.parse(raw);
  return { state: p.state, mergeCommit: p.mergeCommit?.oid ?? null };
}

function fileInBase(file, base) {
  try {
    execFileSync('git', ['fetch', 'origin', base], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    /* fetch best-effort — cat-file ниже всё равно проверит по локальному origin/<base> */
  }
  try {
    execFileSync('git', ['cat-file', '-e', `origin/${base}:${file}`], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

export function main(argv = process.argv) {
  const { pr, file, base } = parseArgs(argv);
  let gh;
  try {
    gh = ghPrJson(pr);
  } catch (e) {
    console.error(`pr:verify: не удалось прочитать PR (${String(e.message ?? e).split('\n')[0]})`);
    return 4;
  }
  const facts = { ...gh, file, base, fileInBase: file ? fileInBase(file, base) : null };
  const { ok, reasons } = assessMerge(facts);
  const label = pr ? `PR #${pr}` : 'PR текущей ветки';
  if (ok) {
    console.log(`pr:verify: ✓ ${label} СМЁРЖЕН (mergeCommit ${gh.mergeCommit.slice(0, 8)}${file ? `, файл в origin/${base}` : ''})`);
    return 0;
  }
  console.error(`pr:verify: ✗ ${label} НЕ подтверждён смёрженным:\n  - ${reasons.join('\n  - ')}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('pr-verify.mjs')) {
  process.exit(main());
}
