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

/** Сколько файлов по pathspec содержат pattern (грубый счётчик). */
function countIn(pattern, ...pathspec) {
  try {
    const out = execFileSync('git', ['grep', '-l', '--', pattern, ...(pathspec.length ? pathspec : ['scripts/'])], { cwd: root, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).length;
  } catch { return 0; }
}

/**
 * Дома ОБЪЯВЛЕНИЯ — структурные записи, а не проза. Упоминание в README объявлением
 * не считается: спека зверя (#1221) отделяет невыводимость от бедной документации —
 * носитель не нем, если у него объявлены адрес и держатель, а не «где-то сказано».
 */
const DECLARATION_HOMES = [
  '*MANIFEST.json',
  'docs/procedures/registry.json',
  'docs/LIVE_SERVICES.md',
];

/**
 * Объявлен ли токен (адрес контура, дом данных) в одном из домов объявления.
 * Дома опрашиваются ПООТДЕЛЬНОСТИ: отсутствующий дом (например, инвентарь ещё не заведён)
 * иначе роняет весь git grep и выдал бы «не объявлено нигде» — ложный улов на пустом месте.
 */
function declarationsOf(token) {
  return DECLARATION_HOMES.reduce((sum, home) => sum + countIn(token, home), 0);
}

/**
 * Дома НОСИТЕЛЯ участника (#1204): где имя перестаёт быть абзацем и становится вызываемым —
 * карта персонажей, реестр каналов, поля описей. README и SKILL сюда НЕ входят: абзац в них
 * и есть проза, которую ловим.
 */
const CARRIER_HOMES = [
  'scripts/ask-persona.mjs',
  'scripts/consilium.mjs',
  'scripts/lib/llm-procedures.json',
];
// NB: `*MANIFEST.json` носителем НЕ считается — `leadPersona` там строка-держатель,
// а не вызов; ровно эту подмену и вскрыл прецедент 25.07 (спека #1204).

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Кириллица → латиница: в машинных домах имена латиницей (`ozhegov`), в прозе — русские. */
function translit(name) {
  return [...name.toLowerCase()].map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch)).join('');
}

/**
 * Есть ли у имени машинный носитель. Ищем и как написано, и в транслите, и по КОРНЮ
 * (без двух последних букв) — русское имя в прозе склоняется («Ангелины», «Ожегову»),
 * а в карте персонажей лежит в одной форме.
 */
function carriersOf(name) {
  const forms = new Set([name, name.toLowerCase(), translit(name), translit(name).slice(0, -2)]);
  return [...forms]
    .filter((f) => f.length >= 4)
    .reduce((sum, form) => sum + CARRIER_HOMES.reduce((s, home) => s + countIn(form, home), 0), 0);
}

const ruleset = {
  consumersOf: (name) => Math.max(0, countIn(name) - 1), // минус файл-владелец
  readersOf: (artifact) => Math.max(0, countIn(artifact) - 1),
  declarationsOf,
  carriersOf,
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
