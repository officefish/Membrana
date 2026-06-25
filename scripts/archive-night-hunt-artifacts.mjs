/**
 * Вечерняя архивация night-hunt отчётов → docs/archive/night-hunt/<YYYY-MM-DD>/
 * Исходники в docs/seanses/night-hunt/ не удаляются.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SOURCE_REL = 'docs/seanses/night-hunt';
const ARCHIVE_ROOT = 'docs/archive/night-hunt';

function localDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`Usage: yarn archive:night-hunt [--force]

Копирует *.md из ${SOURCE_REL}/ в ${ARCHIVE_ROOT}/<YYYY-MM-DD>/ (кроме README.md).`);
    process.exit(0);
  }

  const cwd = process.cwd();
  const sourceDir = resolve(cwd, SOURCE_REL);
  if (!existsSync(sourceDir)) {
    console.error(`Нет каталога ${SOURCE_REL} — пропуск (optional).`);
    process.exit(0);
  }

  const files = readdirSync(sourceDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  if (files.length === 0) {
    console.error('Нет night-hunt отчётов для архивации — пропуск.');
    process.exit(0);
  }

  const day = localDayKey();
  const destDir = resolve(cwd, ARCHIVE_ROOT, day);
  mkdirSync(destDir, { recursive: true });

  const manifest = { day, files: [], archivedAt: new Date().toISOString() };

  for (const name of files) {
    const src = join(sourceDir, name);
    const content = readFileSync(src, 'utf8');
    writeFileSync(join(destDir, name), content, 'utf8');
    manifest.files.push(name);
  }

  writeFileSync(join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.error(`→ ${ARCHIVE_ROOT}/${day}/ (${files.length} файлов)`);
}

main();
