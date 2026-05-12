/**
 * Собирает текстовый снимок состояния репозитория (git, статус, тесты/lint — по возможности).
 * Кроссплатформенная замена scripts/context-collector.sh
 */
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const maxBuffer = 12 * 1024 * 1024;

function captureError(e) {
  const err = e.stderr?.toString?.() ?? '';
  const out = e.stdout?.toString?.() ?? '';
  return (err || out || e.message || '').trim() || '(команда завершилась с ошибкой)';
}

/** Без shell: на Windows в cmd плейсхолдеры `%h` в `--format` ломаются. */
function runGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: process.cwd(),
      maxBuffer,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  } catch (e) {
    return captureError(e);
  }
}

/** Yarn часто .cmd — удобнее через shell. */
function runYarnScript(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      cwd: process.cwd(),
      maxBuffer,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }).trimEnd();
  } catch (e) {
    return captureError(e);
  }
}

function listTopLevel(maxEntries) {
  const cwd = process.cwd();
  let names;
  try {
    names = readdirSync(cwd).sort();
  } catch {
    return '(не удалось прочитать каталог)';
  }
  const lines = [];
  for (const name of names.slice(0, maxEntries)) {
    const p = join(cwd, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    const kind = st.isDirectory() ? 'dir' : 'file';
    lines.push(`${kind}\t${st.size}\t${name}`);
  }
  if (names.length > maxEntries) {
    lines.push(`… ещё ${names.length - maxEntries} элемент(ов)`);
  }
  return lines.join('\n') || '(пусто)';
}

function filterSourceExtensions(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /\.(ts|mjs|cjs|js|tsx|jsx)$/i.test(l.trim()))
    .join('\n');
}

/**
 * @param {{ full?: boolean }} [options]
 * @returns {string}
 */
export function collectRepositoryContext(options = {}) {
  const full = Boolean(options.full);
  const dirLimit = full ? 60 : 20;
  const testLines = full ? 35 : 5;
  const lintLines = full ? 35 : 10;

  const branch = runGit(['branch', '--show-current']) || 'detached';
  const lastCommit = runGit(['log', '-1', '--format=%h - %s (%an, %ar)']) || 'no commits';

  const author = runGit(['config', 'user.name']).trim();
  const todayArgs = ['log', '--since=midnight', '--pretty=format:\u2022 %h: %s (%an)'];
  if (author) todayArgs.push('--author', author);
  const todayLog = runGit(todayArgs);
  const activity = todayLog || 'No commits today';

  const status = runGit(['status', '--short']) || 'Not a git repo';
  const nameStatus = runGit(['diff', '--name-status']) || 'No changes';

  const untrackedRaw = runGit(['ls-files', '--others', '--exclude-standard']);
  const untrackedSrc = filterSourceExtensions(untrackedRaw) || 'None';

  let diffStat = '';
  if (full) {
    diffStat = runGit(['diff', '--stat']) || '';
  }

  const testOut = runYarnScript('yarn test -- --passWithNoTests --silent');
  const testSnippet = testOut.split(/\r?\n/).slice(0, testLines).join('\n');

  const lintOut = runYarnScript('yarn lint -- --quiet');
  const lintSnippet = lintOut.split(/\r?\n/).slice(0, lintLines).join('\n');

  const parts = [
    '=== REPOSITORY CONTEXT ===',
    'Project: Membrana',
    `Path: ${process.cwd()}`,
    `Branch: ${branch}`,
    `Last commit: ${lastCommit}`,
    '',
    "=== TODAY'S ACTIVITY ===",
    activity,
    '',
    '=== CURRENT CHANGES ===',
    status,
    '',
    '=== MODIFIED FILES ===',
    nameStatus,
    '',
    '=== UNTRACKED SOURCE FILES ===',
    untrackedSrc,
    '',
  ];

  if (full && diffStat) {
    parts.push('=== GIT DIFF --stat ===', diffStat, '');
  }

  parts.push(
    '=== DIRECTORY STRUCTURE (top level) ===',
    listTopLevel(dirLimit),
    '',
    '=== TEST STATUS (if available) ===',
    testSnippet || 'Tests not configured or no output',
    '',
    '=== LINT STATUS ===',
    lintSnippet || 'Lint not configured or no output',
    '',
  );

  return parts.join('\n');
}

const selfPath = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(selfPath);
if (isMain) {
  const full = process.argv.includes('--full');
  if (process.stderr.isTTY) {
    console.error('Собираю контекст репозитория Membrana…');
  }
  console.log(collectRepositoryContext({ full }));
}
