#!/usr/bin/env node
/**
 * lens-run — обвязка наведения линз (сессия «рефакторинг инструментов», вердикт
 * lenses-verification-class-container 2026-07-18). Наводит бестиарий на объекты и
 * печатает МАТРИЦУ ПОКРЫТИЯ инструмент × линза → {not-run, clean, N}.
 *
 * Линза НАХОДИТ, не чинит (#533). Каждая находка — с локусом.
 *
 * Usage:
 *   node scripts/lens-run.mjs                       — навести на процесс стратегии (по умолчанию)
 *   node scripts/lens-run.mjs <файл> [<файл>...]    — навести точечно (каррирование: object свободен)
 *   node scripts/lens-run.mjs --json
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { aimBestiary, BESTIARY } from './lib/lens-bestiary.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Процесс стратегии + витрина состояния (объект пробы 18.07)
const DEFAULT_OBJECTS = [
  'scripts/strategy-day.mjs',
  'scripts/lib/strategy-horizon.mjs',
  'scripts/lib/strategy-channels.mjs',
  'scripts/_strategic-plan.mjs',
  'scripts/_main-day-issue.mjs',
  'scripts/main-day-probe.mjs',
  'scripts/lib/night-research.mjs',
  'scripts/night-research.mjs',
  'scripts/hermes-brief.mjs',
];

const readObj = (rel) => {
  const abs = resolve(root, rel);
  return { path: rel, text: existsSync(abs) ? readFileSync(abs, 'utf8') : null };
};

/** Сколько раз имя встречается в scripts/ вне файла-владельца (грубый счётчик потребителей). */
function countIn(pattern) {
  try {
    const out = execFileSync('git', ['grep', '-l', '--', pattern, 'scripts/'], { cwd: root, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).length;
  } catch { return 0; }
}

const ruleset = {
  consumersOf: (name) => Math.max(0, countIn(name) - 1), // минус файл-владелец
  readersOf: (artifact) => Math.max(0, countIn(artifact) - 1),
};

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--json');
  const asJson = process.argv.includes('--json');
  const rels = args.length ? args : DEFAULT_OBJECTS;
  const objects = rels.map(readObj);

  const { matrix, findings } = aimBestiary(objects, ruleset);

  if (asJson) { process.stdout.write(JSON.stringify({ matrix, findings }, null, 2) + '\n'); return; }

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log('# Линза «бестиарий» → матрица покрытия\n');
  console.log(`${pad('инструмент', 36)}${BESTIARY.map((l) => pad(l.defectClass, 14)).join('')}`);
  console.log('-'.repeat(36 + 14 * BESTIARY.length));
  for (const rel of rels) {
    const row = matrix[rel] ?? {};
    console.log(`${pad(rel, 36)}${BESTIARY.map((l) => pad(row[l.defectClass] ?? 'not-run', 14)).join('')}`);
  }

  const byClass = {};
  for (const f of findings) byClass[f.defectClass] = (byClass[f.defectClass] ?? 0) + 1;
  console.log(`\nВСЕГО НАХОДОК: ${findings.length} — ${Object.entries(byClass).map(([k, v]) => `${k}:${v}`).join(' · ') || 'ноль'}`);
  console.log('(`not-run` ≠ `clean`: not-run — линза не отработала, clean — отработала и чисто)\n');

  if (findings.length) {
    console.log('--- НАХОДКИ (линза находит, НЕ чинит) ---');
    for (const f of findings.slice(0, 40)) console.log(`  [${f.defectClass}] ${f.locus} — ${f.evidence}`);
    if (findings.length > 40) console.log(`  … ещё ${findings.length - 40}`);
  }
}

main();
