/**
 * Копирует docs/DAILY_CODE_REVIEW.md в docs/archive/daily-code-review/ с меткой времени.
 * Исходный файл не удаляется. Существующие архивы с тем же именем не перезаписываются.
 *
 * Один процесс Node = ровно одна новая копия (один copyFileSync). Несколько файлов в
 * архиве появляются только после нескольких запусков yarn/node. Чтобы не плодить дубли
 * при повторном запуске без изменений текста, см. логику «последний архив = источник» ниже.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { explainStaleness, isFresh } from './lib/artifact-freshness.mjs';

const SOURCE_REL = 'docs/DAILY_CODE_REVIEW.md';
const ARCHIVE_DIR_REL = 'docs/archive/daily-code-review';

const force = process.argv.includes('--force');
const allowStale = process.argv.includes('--allow-stale');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node scripts/archive-daily-code-review.mjs [--help] [--force]

  --help         Эта справка.
  --force        Создать архив даже если байт-в-байт совпадает с последним файлом в архиве.
  --allow-stale  Заархивировать НЕСВЕЖИЙ отчёт осознанно (гейт свежести пропускается,
                 факт печатается). По умолчанию несвежий отчёт архивировать нельзя.

Копирует ${SOURCE_REL} в ${ARCHIVE_DIR_REL}/ с именем вида
DAILY_CODE_REVIEW-<ISO-дата-время>.md (двоеточия в дате заменены на «-» для Windows).
При совпадении имени добавляется суффикс _2, _3, …

Один запуск команды создаёт не больше одного нового файла. Команды yarn save-code-review
и yarn archive:daily-review указывают на один и тот же скрипт — не нужно вызывать обе
подряд. Если текст отчёта не менялся, повторный запуск без --force завершится пропуском.`);
  process.exit(0);
}

const cwd = process.cwd();
const sourcePath = resolve(cwd, SOURCE_REL);
const archiveDir = resolve(cwd, ARCHIVE_DIR_REL);

function isoStampForFilename(date = new Date()) {
  return date.toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

function allocateArchivePath() {
  const stamp = isoStampForFilename();
  const baseName = `DAILY_CODE_REVIEW-${stamp}.md`;
  let candidate = join(archiveDir, baseName);
  if (!existsSync(candidate)) {
    return candidate;
  }
  const stem = `DAILY_CODE_REVIEW-${stamp}`;
  for (let n = 2; n < 10_000; n++) {
    candidate = join(archiveDir, `${stem}_${n}.md`);
    if (!existsSync(candidate)) {
      return candidate;
    }
  }
  const fine = `${stem}-${process.hrtime.bigint()}.md`;
  return join(archiveDir, fine);
}

if (!existsSync(sourcePath)) {
  console.error('Файл не найден:', sourcePath);
  process.exit(1);
}

/**
 * ГЕЙТ СВЕЖЕСТИ (узел F, вердикт scripts-boundary M0 — несущее ребро S→F).
 *
 * Инцидент, ради которого гейт стоит здесь: 15.07 code-review упал (фолбэк без
 * кредита, exit 127), падение проглотил `|| true`, а этот скрипт заархивировал
 * ВЧЕРАШНИЙ отчёт под СЕГОДНЯШНЕЙ меткой времени — имя архива берётся из
 * `new Date()`, а не из содержимого. Байт-сравнение ниже от этого не спасает:
 * оно ловит только точный дубль последнего архива.
 *
 * Дата берётся из провенанса в теле, не из mtime: mtime недетерминирован при
 * checkout. Ничего не чинит сам (запрет #533) — предъявляет и останавливается.
 */
const sourceContent = readFileSync(sourcePath, 'utf8');
const freshnessCtx = { today: new Date().toISOString() };

if (!isFresh({ content: sourceContent }, freshnessCtx)) {
  const why = explainStaleness(SOURCE_REL, { content: sourceContent }, freshnessCtx);
  if (!allowStale) {
    console.error(`✗ Гейт свежести: ${why}`);
    console.error('  Архивировать несвежий отчёт нельзя — он ляжет в архив под сегодняшней меткой.');
    console.error('  Причина обычно выше по цепочке: code-review не отработал. Сначала почините его.');
    console.error('  Осознанно заархивировать несвежий: --allow-stale');
    process.exit(1);
  }
  console.error(`⚠ Гейт свежести пропущен по --allow-stale: ${why}`);
}

mkdirSync(archiveDir, { recursive: true });

function newestArchiveFilePath() {
  if (!existsSync(archiveDir)) {
    return null;
  }
  const names = readdirSync(archiveDir).filter(
    (n) => n.startsWith('DAILY_CODE_REVIEW-') && n.endsWith('.md'),
  );
  if (names.length === 0) {
    return null;
  }
  let bestPath = null;
  let bestMtime = -Infinity;
  for (const n of names) {
    const p = join(archiveDir, n);
    const m = statSync(p).mtimeMs;
    if (m >= bestMtime) {
      bestMtime = m;
      bestPath = p;
    }
  }
  return bestPath;
}

if (!force) {
  const latest = newestArchiveFilePath();
  if (latest) {
    const srcBuf = readFileSync(sourcePath);
    const prevBuf = readFileSync(latest);
    if (srcBuf.length === prevBuf.length && Buffer.compare(srcBuf, prevBuf) === 0) {
      console.log('Пропуск архива: содержимое совпадает с последним файлом:', latest);
      process.exit(0);
    }
  }
}

const destPath = allocateArchivePath();
copyFileSync(sourcePath, destPath);
console.log(destPath);
