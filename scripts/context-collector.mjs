/**
 * Собирает текстовый снимок состояния репозитория (git, статус, тесты/lint — по возможности).
 * Кроссплатформенная замена scripts/context-collector.sh
 */
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONTEXT_COLLECT_IGNORE_GLOBS, shouldSkipContextPath } from './context-collector-paths.mjs';

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
  const visible = names.filter((name) => !shouldSkipContextPath(name));
  for (const name of visible.slice(0, maxEntries)) {
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
  if (visible.length > maxEntries) {
    lines.push(`… ещё ${visible.length - maxEntries} элемент(ов)`);
  }
  return lines.join('\n') || '(пусто)';
}

function filterSourceExtensions(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /\.(ts|mjs|cjs|js|tsx|jsx)$/i.test(l.trim()))
    .join('\n');
}

/** Сводка turbo: итог Tasks + строки с ошибками (не только заголовок запуска). */
function extractTurboSnippet(output, maxLines) {
  if (!output?.trim()) {
    return '';
  }

  const lines = output.split(/\r?\n/);
  const picked = new Set();

  const push = (line) => {
    const trimmed = line.trimEnd();
    if (!trimmed || picked.has(trimmed)) {
      return;
    }
    picked.add(trimmed);
  };

  for (const line of lines) {
    if (
      / Tasks:/i.test(line) ||
      /Failed:/i.test(line) ||
      /ERROR\s+.*exited/i.test(line) ||
      /#(?:test|lint):.*(?:FAIL|ERROR|failed)/i.test(line) ||
      /Test Files\s+\d+ failed/i.test(line) ||
      /Usage Error:/i.test(line)
    ) {
      push(line);
    }
  }

  for (const line of lines.slice(-12)) {
    push(line);
  }

  return [...picked].slice(0, maxLines).join('\n');
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

  // \u0414\u043d\u0435\u0432\u043d\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c: \u0412\u0421\u0415 \u043a\u043e\u043c\u043c\u0438\u0442\u044b \u0432\u0435\u0442\u043a\u0438 \u0437\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f, \u0431\u0435\u0437 \u0444\u0438\u043b\u044c\u0442\u0440\u0430 \u043f\u043e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e\u043c\u0443
  // git-\u0430\u0432\u0442\u043e\u0440\u0443. \u0420\u0430\u0431\u043e\u0442\u0430 \u0434\u043d\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0438\u0442 squash-\u043c\u0435\u0440\u0434\u0436\u0430\u043c\u0438 PR (\u0430\u0432\u0442\u043e\u0440 \u043a\u043e\u043c\u043c\u0438\u0442\u0430 = GitHub-\u0430\u043a\u043a\u0430\u0443\u043d\u0442
  // \u043c\u0435\u0440\u0434\u0436\u0435\u0440\u0430, \u0430 \u041d\u0415 `git config user.name`), \u043f\u043e\u044d\u0442\u043e\u043c\u0443 `--author <user.name>` \u0434\u0430\u0432\u0430\u043b \u043b\u043e\u0436\u043d\u044b\u0439
  // \u00abNo commits today\u00bb \u0432 \u043f\u043b\u043e\u0442\u043d\u044b\u0435 \u0434\u043d\u0438 (\u0441\u043c. team-evening-feedback 2026-07-08, \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 #3).
  const todayLog = runGit(['log', '--since=midnight', '--pretty=format:\u2022 %h: %s (%an)']);
  const activity = todayLog || 'No commits today';

  const status = runGit(['status', '--short']) || 'Not a git repo';
  const nameStatus = runGit(['diff', '--name-status']) || 'No changes';

  const untrackedRaw = runGit(['ls-files', '--others', '--exclude-standard']);
  const untrackedSrc = filterSourceExtensions(untrackedRaw) || 'None';

  let diffStat = '';
  if (full) {
    diffStat = runGit(['diff', '--stat']) || '';
  }

  const testOut = runYarnScript('yarn turbo run test --concurrency=3 --continue');
  const testSnippet = extractTurboSnippet(testOut, testLines);

  const lintOut = runYarnScript('yarn turbo run lint --concurrency=3 --continue');
  const lintSnippet = extractTurboSnippet(lintOut, lintLines);

  const parts = [
    '=== REPOSITORY CONTEXT ===',
    'Project: Membrana',
    `Sensitive-path policy (globs): ${CONTEXT_COLLECT_IGNORE_GLOBS.join(', ')}`,
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
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`Usage: node scripts/context-collector.mjs [--full] [--help]

  --full   Включить расширенный снимок (diff --stat, больше строк тестов/lint).
  --help   Эта справка.

Скрипт не обходит дерево исходников: только git, yarn и ограниченный список
верхнего уровня каталога (node_modules/.git/.env скрыты из списка).`);
    process.exit(0);
  }
  const full = process.argv.includes('--full');
  if (process.stderr.isTTY) {
    console.error('Собираю контекст репозитория Membrana…');
  }
  console.log(collectRepositoryContext({ full }));
}
