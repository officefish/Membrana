#!/usr/bin/env node
/**
 * verify-encoding (#469 ti-6): гард против укусов PowerShell 5.1 —
 * (а) UTF-8 BOM в текстовых источниках, (б) сигнатуры двойной перекодировки
 * кириллицы (UTF-8, прочитанный как cp1251 и пересохранённый: «вЂ¦», «РЎ…»).
 *
 * Сканирует ТОЛЬКО git-tracked файлы (docs/**.md, scripts/**.mjs) — артефакты
 * из .gitignore (docs/reviews и т.п.) не проверяются. Вызывается хвостом
 * `yarn docs:lint`. Триггер: 3 инцидента 2026-07-14 (MEMORY.md, BOM в
 * review-file, NUL-литерал).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/**
 * Сигнатуры mojibake: расширенные кириллические буквы (Ђ Ѓ Ў Ћ Џ ћ ђ љ њ ќ è)
 * сразу после «в»/«Р»/«С» в легитимном русском/английском тексте не встречаются,
 * а при двойной перекодировке UTF-8→cp1251 возникают массово («вЂ» из тире/кавычек,
 * «РЎ» из «С», «СЂ» + «Р» из слогов). Осторожно: «Рё» НЕ сигнатура — есть
 * настоящие слова («Рёв»).
 */
const MOJIBAKE_RE = /[РС][ЂЃЋЎЏћђљњќ]|вЂ|Р вЂ/u;

/**
 * Файл, легитимно ЦИТИРУЮЩИЙ сигнатуры кракозябр (доки самого гарда, протоколы),
 * помечается маркером — mojibake-проверка снимается, BOM-проверка остаётся.
 */
export const ALLOW_MARKER = '<!-- verify-encoding: allow-mojibake-examples -->';

/** Чистая проверка одного файла: список проблем (пусто = чисто). */
export function detectEncodingIssues(relPath, buffer) {
  const issues = [];
  if (buffer.subarray(0, 3).equals(BOM)) {
    issues.push(`${relPath}: UTF-8 BOM (PS 5.1 след; пересохрани без BOM)`);
  }
  const text = buffer.toString('utf8');
  if (text.includes(ALLOW_MARKER)) return issues;
  const m = text.match(MOJIBAKE_RE);
  if (m) {
    const idx = text.indexOf(m[0]);
    const line = text.slice(0, idx).split('\n').length;
    issues.push(
      `${relPath}:${line}: сигнатура двойной перекодировки кириллицы («${m[0]}») — файл читался как cp1251`,
    );
  }
  return issues;
}

const isMain = process.argv[1]?.endsWith('verify-encoding.mjs');
if (isMain) {
  const tracked = execSync("git ls-files docs/**/*.md docs/*.md scripts/*.mjs scripts/lib/*.mjs", {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const problems = [];
  for (const rel of tracked) {
    try {
      problems.push(...detectEncodingIssues(rel, readFileSync(join(root, rel))));
    } catch {
      // файл в индексе, но отсутствует на диске (переименование в ветке) — пропуск
    }
  }

  if (problems.length > 0) {
    console.error(`verify-encoding — ПРОВАЛ (${problems.length}):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`verify-encoding — OK (${tracked.length} файлов: BOM и mojibake не найдены)`);
}
