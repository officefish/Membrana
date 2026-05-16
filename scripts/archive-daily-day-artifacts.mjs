/**
 * Вечерний снимок утренних артефактов дня в docs/archive/daily-day/<YYYY-MM-DD>/.
 * Исходники в docs/ не удаляются. Запускать до code-review (перед перезаписью утром).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  allocateBundleDir,
  copyIfChanged,
  findExistingBundleDir,
  resolveDayKey,
  writeManifest,
} from './lib/archive-doc-snapshot.mjs';

const ARCHIVE_ROOT_REL = 'docs/archive/daily-day';

const ARTIFACTS = [
  {
    rel: 'docs/STRATEGIC_PLAN_DAY.md',
    archiveName: 'STRATEGIC_PLAN_DAY.md',
    label: 'STRATEGIC_PLAN_DAY',
  },
  {
    rel: 'docs/DAILY_STANDUP.md',
    archiveName: 'DAILY_STANDUP.md',
    label: 'DAILY_STANDUP',
  },
  {
    rel: 'docs/MAIN_DAY_ISSUE.md',
    archiveName: 'MAIN_DAY_ISSUE.md',
    label: 'MAIN_DAY_ISSUE',
  },
];

const force = process.argv.includes('--force');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node scripts/archive-daily-day-artifacts.mjs [--help] [--force]

  --help   Эта справка.
  --force  Создать новый снимок даже если байт-в-байт совпадает с существующим бандлом дня.

Копирует три утренних артефакта в ${ARCHIVE_ROOT_REL}/<YYYY-MM-DD>/:
  STRATEGIC_PLAN_DAY.md, DAILY_STANDUP.md, MAIN_DAY_ISSUE.md
+ manifest.json (метаданные для навигации).

Ключ дня (<YYYY-MM-DD>) выводится из дат в тексте файлов (стендап, MAIN_DAY_ISSUE, комментарий «Сгенерировано»).
Повторный запуск без --force пропускается, если содержимое уже есть в архиве за этот день.

Вечерний порядок: yarn archive:daily-day → yarn code-review → … → yarn save-code-review`);
  process.exit(0);
}

const cwd = process.cwd();
const archiveRoot = resolve(cwd, ARCHIVE_ROOT_REL);

function localDayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const present = ARTIFACTS.map((a) => {
  const sourcePath = resolve(cwd, a.rel);
  const content = existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';
  return { ...a, sourcePath, content };
}).filter((a) => existsSync(a.sourcePath));

if (present.length === 0) {
  console.error('Нет ни одного файла для архивации:', ARTIFACTS.map((a) => a.rel).join(', '));
  process.exit(1);
}

const missing = ARTIFACTS.filter((a) => !existsSync(resolve(cwd, a.rel)));
for (const m of missing) {
  console.warn('Пропуск (файл отсутствует):', m.rel);
}

const dayKey = resolveDayKey(
  present.map((p) => ({ label: p.label, content: p.content })),
  localDayKey,
);

const fileOps = present.map((p) => ({
  archiveName: p.archiveName,
  sourcePath: p.sourcePath,
  label: p.label,
}));

if (!force) {
  const existing = findExistingBundleDir(archiveRoot, dayKey, fileOps);
  if (existing) {
    console.log('Пропуск архива: снимок дня уже в архиве:', existing);
    process.exit(0);
  }
}

const needNewBundle =
  force &&
  existsSync(join(archiveRoot, dayKey)) &&
  !fileOps.every((f) => findExistingBundleDir(archiveRoot, dayKey, [f]));

const bundleDir = allocateBundleDir(archiveRoot, dayKey, needNewBundle && force);
const archivedAt = new Date().toISOString();
const manifestFiles = [];

for (const p of present) {
  const destPath = join(bundleDir, p.archiveName);
  const result = copyIfChanged(p.sourcePath, destPath, force);
  const stat = statSync(p.sourcePath);
  manifestFiles.push({
    label: p.label,
    source: p.rel,
    archiveName: p.archiveName,
    bytes: stat.size,
    action: result,
  });
  if (result === 'copied') {
    console.log('→', destPath);
  } else if (result === 'skipped-identical') {
    console.log('= (без изменений)', destPath);
  }
}

writeManifest(bundleDir, {
  dayKey,
  archivedAt,
  command: 'yarn archive:daily-day',
  bundleDir: join(ARCHIVE_ROOT_REL, bundleDir.split(/[/\\]/).slice(-1)[0]),
  files: manifestFiles,
});

console.log('manifest:', join(bundleDir, 'manifest.json'));
