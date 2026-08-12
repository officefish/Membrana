#!/usr/bin/env node
/**
 * yarn secret:inventory <dir|glob|file> [--json] — инвентарь засвеченного
 * (b5 s-queue-2026-08-11, #1266): таблица «файл × класс правила × вхождений»
 * как ВХОД ротации ключей. Обёртка над ядром резака `lib/secret-redact.mjs`
 * (guard нарезки: ядро не правится — только читается).
 *
 * ЧЕСТНАЯ ОГОВОРКА: числа — ВЕРХНЯЯ ГРАНИЦА. Детектор правил жаден (любое
 * непустое значение под чувствительным JSON-ключом — находка), синтетика и
 * фикстуры считаются наравне с боевым. Инвентарь называет, ГДЕ смотреть, а не
 * доказывает утечку.
 *
 * ЗНАЧЕНИЯ НЕ ПЕЧАТАЮТСЯ НИ В ОДНОМ РЕЖИМЕ: ядро в `cuts[]` значений не несёт
 * (инвариант резака), сюда попадают только имя класса, файл и счётчик.
 *
 * Exit: 0 — инвентарь собран (и пустой — тоже собран) · 2 — ошибка входа.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { redactJsonSensitiveValues, redactSecrets } from './lib/secret-redact.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Каталоги, в которые инвентарь не ходит: чужой код и артефакты сборки. */
export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'cache', '.yarn']);

/** Бинарные расширения не читаются: резак текстовый, мимо него — мимо инвентаря. */
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.gz', '.tar',
  '.wav', '.mp3', '.mp4', '.woff', '.woff2', '.ttf', '.eot', '.exe', '.dll',
]);

function isBinaryPath(p) {
  const dot = p.lastIndexOf('.');
  return dot >= 0 && BINARY_EXTS.has(p.slice(dot).toLowerCase());
}

/** Собрать список файлов цели: файл — как есть, каталог — рекурсивно, суффикс-глоб `*.x` — фильтром. */
export function collectTargetFiles(rootAbs, target) {
  const abs = resolve(rootAbs, target.replace(/^\.\//u, ''));
  const star = target.includes('*');
  const files = [];
  const walk = (dir, filter) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full, filter);
      } else if ((filter === null || entry.name.endsWith(filter)) && !isBinaryPath(entry.name)) {
        files.push(full);
      }
    }
  };
  if (star) {
    // Единственная поддержанная форма глоба: `<dir>/**/*.ext` либо `*.ext` —
    // фильтр по суффиксу от каталога-основания. Иное — ошибка входа, не догадка.
    const m = target.match(/^(?:(.*?)\/)?\*{1,2}(?:\/\*)?(\.[A-Za-z0-9]+)$/u)
      ?? target.match(/^(?:(.*?)\/)?\*(\.[A-Za-z0-9]+)$/u);
    if (m === null) throw new Error(`неподдержанная форма глоба: «${target}» (поддержано: <dir>/**/*.ext, *.ext, каталог, файл)`);
    const baseDir = resolve(rootAbs, m[1] ?? '.');
    walk(baseDir, m[2]);
    return files.sort();
  }
  const st = statSync(abs, { throwIfNoEntry: false });
  if (st === undefined) throw new Error(`цель не существует: «${target}»`);
  if (st.isFile()) return [abs];
  walk(abs, null);
  return files.sort();
}

/**
 * ЧИСТАЯ сборка инвентаря по содержимому: [{path, text}] → строки таблицы.
 * Классы: имена правил резака (`cuts[].name`) + чувствительные JSON-ключи
 * (`json:<имя ключа из пути>` у файлов, разобравшихся как JSON).
 */
export function buildSecretInventory(entries) {
  const rows = [];
  for (const { path, text } of entries) {
    const byClass = new Map();
    for (const cut of redactSecrets(text).cuts) {
      byClass.set(cut.name, (byClass.get(cut.name) ?? 0) + 1);
    }
    if (path.endsWith('.json')) {
      try {
        for (const cut of redactJsonSensitiveValues(JSON.parse(text)).cuts) {
          const cls = `json:${cut.name}`;
          byClass.set(cls, (byClass.get(cls) ?? 0) + 1);
        }
      } catch {
        // не-JSON с расширением .json — текстовый проход уже состоялся
      }
    }
    for (const [cls, count] of [...byClass.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      rows.push({ file: path, class: cls, count });
    }
  }
  return rows.sort((a, b) => a.file.localeCompare(b.file) || a.class.localeCompare(b.class));
}

/** Таблица для глаз: файл × класс × вхождений + честная оговорка. */
export function renderInventoryTable(rows, { target, filesScanned }) {
  const lines = [
    `secret:inventory — цель «${target}» · файлов прочитано: ${filesScanned} · находок: ${rows.reduce((s, r) => s + r.count, 0)}`,
    'Числа — ВЕРХНЯЯ ГРАНИЦА (детектор жаден, синтетика считается наравне с боевым); значения не печатаются.',
  ];
  if (rows.length === 0) {
    lines.push('находок нет — по правилам резака в цели чисто (это не сертификат, а отсутствие срабатываний)');
    return lines.join('\n');
  }
  lines.push('', '| файл | класс правила | вхождений |', '| --- | --- | ---: |');
  for (const r of rows) lines.push(`| ${r.file} | ${r.class} | ${r.count} |`);
  return lines.join('\n');
}

function main(argv) {
  const args = { target: null, json: false };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') { args.help = true; }
    else if (a.startsWith('--')) throw new Error(`неизвестный флаг «${a}»`);
    else if (args.target === null) args.target = a;
    else throw new Error('цель уже названа — вторая не принимается');
  }
  if (args.help === true || args.target === null) {
    console.log('Usage: yarn secret:inventory <dir|glob|file> [--json]\n\nИнвентарь засвеченного: файл × класс правила × вхождений. Значения не печатаются.\nExit: 0 — собран · 2 — ошибка входа.');
    return args.help === true ? 0 : 2;
  }
  const files = collectTargetFiles(REPO_ROOT, args.target);
  const entries = files.map((abs) => {
    let text = '';
    try { text = readFileSync(abs, 'utf8'); } catch { text = ''; }
    return { path: relative(REPO_ROOT, abs).split('\\').join('/'), text };
  });
  const rows = buildSecretInventory(entries);
  if (args.json) {
    console.log(JSON.stringify({ target: args.target, filesScanned: files.length, upperBound: true, rows }, null, 2));
  } else {
    console.log(renderInventoryTable(rows, { target: args.target, filesScanned: files.length }));
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`secret:inventory — ошибка входа: ${String(e?.message ?? e)}`);
    process.exitCode = 2;
  }
}
