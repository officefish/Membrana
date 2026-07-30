#!/usr/bin/env node
/**
 * yarn ci:triage [N] — красный CI: моё или вне диффа (#1493 Ф4).
 *
 * Без номера — PR текущей ветки. Read-only: ничего не перезапускает, только называет.
 * Первый ход при исходе «вне диффа» печатается готовой командой.
 *
 * Exit: 0 — вне диффа (вероятны кеш/флак) · 1 — моё · 2 — инструментальная / не опознано.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractFailureTargets, renderTriage, triage } from './lib/ci-red-triage.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function sh(cmd, args, timeout = 120_000) {
  return String(execFileSync(cmd, args, { cwd: root, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }));
}

function main() {
  const arg = process.argv[2];
  let pr = arg && /^\d+$/u.test(arg) ? arg : null;
  try {
    if (!pr) pr = String(JSON.parse(sh('gh', ['pr', 'view', '--json', 'number'])).number);
  } catch {
    console.error('ci:triage — номер PR не определился (gh недоступен) — передай номером: yarn ci:triage 1487');
    return 2;
  }

  let base = 'main';
  let diffFiles = [];
  try {
    const view = JSON.parse(sh('gh', ['pr', 'view', pr, '--json', 'baseRefName,files']));
    base = view.baseRefName || base;
    diffFiles = (view.files ?? []).map((f) => f.path).filter(Boolean);
  } catch {
    console.error(`ci:triage — не прочитались файлы PR #${pr}; без диффа сравнивать нечего`);
    return 2;
  }

  let failed = [];
  try {
    const rollup = JSON.parse(sh('gh', ['pr', 'view', pr, '--json', 'statusCheckRollup'])).statusCheckRollup ?? [];
    failed = rollup.filter((c) => String(c.conclusion || c.state).toUpperCase() === 'FAILURE');
  } catch {
    console.error(`ci:triage — не прочитались проверки PR #${pr}`);
    return 2;
  }
  if (failed.length === 0) {
    console.log(`ci:triage — на PR #${pr} упавших проверок нет; разбирать нечего`);
    return 0;
  }

  let log = '';
  for (const check of failed) {
    const runId = String(check.detailsUrl || '').match(/\/runs\/(\d+)/u)?.[1];
    if (!runId) continue;
    try {
      log += sh('gh', ['run', 'view', runId, '--log-failed'], 300_000);
    } catch (e) {
      // Лог мог не отдаться (права, срок хранения) — это не повод врать про исход.
      console.error(`  ⚠ лог прогона ${runId} не прочитался (${String(e.message ?? e).split('\n')[0]})`);
    }
  }

  const { files, modules } = extractFailureTargets(log);
  const verdict = triage({ failureFiles: files, failureModules: modules, diffFiles });
  for (const line of renderTriage(verdict, { failureFiles: files, failureModules: modules })) console.log(line);
  console.log(`  дифф PR #${pr} против ${base}: ${diffFiles.length} файл(ов)`);

  if (verdict.state === 'вне диффа') {
    console.log(`\nпервый ход: gh run rerun ${String(failed[0].detailsUrl || '').match(/\/runs\/(\d+)/u)?.[1] ?? '<runId>'} --failed`);
    return 0;
  }
  return verdict.state === 'моё' ? 1 : 2;
}

if (process.argv[1]?.endsWith('ci-triage.mjs')) process.exit(main());
