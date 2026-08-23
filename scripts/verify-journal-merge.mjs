#!/usr/bin/env node
/**
 * Зуб журналов под союзным слиянием (#2096) — порт.
 *
 *   node scripts/verify-journal-merge.mjs [--json]
 *
 * Проверяет три вещи, и каждая отвечает на свою опасность союза:
 *   1. двойники по ключу — союз склеивает их МОЛЧА, без маркера;
 *   2. точные повторы строк — дважды записанный акт в append-only ленте есть сбой;
 *   3. журнал мимо соглашения — он союза не получит и вернёт конфликты, о которых
 *      никто не узнает, пока счёт снова не пойдёт на классы.
 *
 * Правила — чистое ядро `lib/journal-merge.mjs`; здесь ФС, git и код возврата.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findJournalDuplicates, isJournalPath, unguardedJournals } from './lib/journal-merge.mjs';

const EXIT_BREACH = 25;

/** Все `.jsonl` под контролем git. */
export function listJsonl(repoRoot, run = git) {
  const out = run(['ls-files', '*.jsonl'], repoRoot);
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Что git ДЕЙСТВИТЕЛЬНО думает о слиянии этих путей.
 *
 * Зуб обязан спрашивать git, а не свою модель. Предикат `isJournalPath` описывает
 * соглашение; `.gitattributes` его исполняет — и разойтись они могут молча. Ровно это и
 * случилось при сборке: ядро уже считало три файла журналами, а правило их ещё не покрывало,
 * и зуб был готов доложить «класс не разошёлся» про покрытие, которого не существовало.
 * Сторож, поверивший себе вместо предмета, ничего не удостоверяет.
 *
 * @returns {Map<string, string>} путь → значение атрибута merge
 */
export function mergeAttrs(repoRoot, paths, run = git) {
  const attrs = new Map();
  if (paths.length === 0) return attrs;
  let out = '';
  try {
    out = run(['check-attr', 'merge', '--', ...paths], repoRoot);
  } catch {
    return attrs;
  }
  for (const line of out.split('\n')) {
    const m = /^(.*): merge: (.*)$/u.exec(line.trim());
    if (m) attrs.set(m[1], m[2]);
  }
  return attrs;
}

/**
 * Замер истории пути: сколько строк дописано, сколько удалено, за сколько коммитов.
 * Нужен, чтобы отличить журнал от переписываемого файла НЕ по имени.
 */
export function historyStats(repoRoot, paths, run = git) {
  /** @type {Map<string, {path: string, adds: number, dels: number, commits: number}>} */
  const stats = new Map();
  for (const p of paths) stats.set(p, { path: p, adds: 0, dels: 0, commits: 0 });
  if (paths.length === 0) return [];

  let out = '';
  try {
    out = run(['log', '--no-merges', '-n', '400', '--numstat', '--format=%H', '--', ...paths], repoRoot);
  } catch {
    return [...stats.values()];
  }
  const seenCommit = new Map();
  let commit = null;
  for (const raw of out.split('\n')) {
    const line = raw.trim();
    if (/^[0-9a-f]{40}$/u.test(line)) { commit = line; continue; }
    const m = /^(\d+)\t(\d+)\t(.+)$/u.exec(line);
    if (!m) continue;
    const s = stats.get(m[3]);
    if (!s) continue;
    s.adds += Number(m[1]);
    s.dels += Number(m[2]);
    const key = `${m[3]}@${commit}`;
    if (!seenCommit.has(key)) { seenCommit.set(key, true); s.commits += 1; }
  }
  return [...stats.values()];
}

export function verifyJournals(repoRoot, io = { readFileSync }) {
  const all = listJsonl(repoRoot);
  const journals = all.filter(isJournalPath);
  const others = all.filter((p) => !isJournalPath(p));

  const breaches = [];
  for (const rel of journals) {
    let body;
    try {
      body = io.readFileSync(join(repoRoot, rel), 'utf8');
    } catch {
      continue; // нечитаемый файл — не предмет этого зуба
    }
    const { keyed, exact } = findJournalDuplicates(body);
    for (const d of keyed) {
      breaches.push(`двойник по ключу: ${rel} · ${d.key} встречается в ${d.variants.length} разных записях — союзное слияние склеило их молча`);
    }
    for (const d of exact) {
      breaches.push(`точный повтор: ${rel} · строка записана ${d.count} раза — в append-only ленте это сбой записи или потерянное слияние`);
    }
  }

  // Правило объявлено — исполняется ли оно? Спрашиваем git о каждом журнале.
  const attrs = mergeAttrs(repoRoot, journals);
  for (const rel of journals) {
    const attr = attrs.get(rel) ?? 'unspecified';
    if (attr !== 'union') {
      breaches.push(`правило не исполняется: ${rel} признан журналом, но git отдаёт merge=${attr} — соглашение разошлось с .gitattributes`);
    }
  }

  const unguarded = unguardedJournals(historyStats(repoRoot, others));
  for (const p of unguarded) {
    breaches.push(`журнал мимо соглашения: ${p} по истории только дописывается, но лежит вне trail/ и op-log/ — союзного слияния не получит и вернёт конфликты`);
  }

  return { journals: journals.length, checked: all.length, unguarded, breaches };
}

function main() {
  const repoRoot = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
  const result = verifyJournals(repoRoot);
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.breaches.length === 0) {
    console.log(`journals:verify — журналов ${result.journals} из ${result.checked} файлов .jsonl · двойников нет, класс не разошёлся`);
  } else {
    console.log(`journals:verify — журналов ${result.journals} · находок ${result.breaches.length}`);
    for (const b of result.breaches) console.log(`  ✖ ${b}`);
    console.log('  союз снимает конфликт вместе со способностью сказать «нет» — эти находки и есть то «нет»');
  }
  process.exit(result.breaches.length === 0 ? 0 : EXIT_BREACH);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
