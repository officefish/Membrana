#!/usr/bin/env node
/**
 * yarn audit:evening — отчёт «что происходило за день» в трёх местах, где живёт работа:
 * репозиторий, реестр задач, граф правды.
 *
 * Показывает движение, а не оценки: сколько коммитов и куда, какие карточки завелись
 * и уехали в архив, какие токены правды закристаллизованы и отозваны.
 *
 * Как считается «за день»: берётся последний коммит ДО начала дня как база, и всё
 * меряется относительно него. Поэтому отчёт воспроизводим — он функция от двух
 * снимков репозитория, а не от момента запуска.
 *
 *   yarn audit:evening                  # сегодня, в docs/DAILY_AUDIT.md + архив
 *   yarn audit:evening --date 2026-07-17
 *   yarn audit:evening --stdout         # только напечатать, ничего не писать
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { linesByArea, registryMovement, renderReport, repoMovement, truthMovement } from './lib/audit-evening.mjs';

const repoRoot = process.cwd();
const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`yarn audit:evening [--date YYYY-MM-DD] [--stdout]

  Что происходило за день: репозиторий · реестр задач · граф правды.
  Пишет docs/DAILY_AUDIT.md и датированный снимок в docs/archive/daily-day/<date>/audit.md.

  --date    другой день (по умолчанию сегодня)
  --stdout  напечатать в stdout, ничего не писать на диск`);
  process.exit(0);
}

const dateArg = argv.find((a) => a.startsWith('--date='))?.slice('--date='.length)
  ?? (argv.includes('--date') ? argv[argv.indexOf('--date') + 1] : '');
const date = dateArg || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
  console.error(`--date ожидает YYYY-MM-DD, получено: ${date}`);
  process.exit(1);
}

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1e8 }).trim();

/**
 * Снимок JSON-файла на заданном коммите. Файла на той ревизии могло не быть —
 * тогда движение посчитается как «всё добавлено», и это честно.
 *
 * `stdio: pipe` обязателен: без него git сыплет «fatal: path … exists on disk, but
 * not in …» прямо в вывод отчёта, хотя случай штатный и обработан.
 */
function jsonAt(sha, relPath) {
  try {
    const raw = execFileSync('git', ['show', `${sha}:${relPath}`], {
      cwd: repoRoot, encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// База дня: последний коммит ДО 00:00 этой даты. Всё меряется относительно него.
let base;
try {
  base = git('rev-list', '-1', `--before=${date} 00:00`, 'HEAD');
} catch {
  base = '';
}
if (!base) {
  console.error(`Нет коммитов до ${date} — не от чего отсчитывать день.`);
  process.exit(1);
}

// Конец дня — последний коммит ЭТОЙ даты, а не текущий HEAD. Иначе отчёт за прошлый
// день втягивает всё, что случилось позже: прогон за 17.07 показывал 71 коммит,
// смешивая два дня. Для сегодняшнего дня граница совпадает с HEAD естественным образом.
const nextDay = new Date(`${date}T00:00:00Z`);
nextDay.setUTCDate(nextDay.getUTCDate() + 1);
const dayAfter = nextDay.toISOString().slice(0, 10);
const head = git('rev-list', '-1', `--before=${dayAfter} 00:00`, 'HEAD');
if (!head || head === base) {
  console.error(`За ${date} коммитов нет — день пуст.`);
}

// Коммиты дня с числом затронутых файлов (--shortstat агрегировать сложнее, чем счесть).
// Разделитель записей — %x1e (RS), НЕ пустая строка: между заголовком и списком
// файлов git сам вставляет пустую строку, и раскол по '\n\n' резал каждую запись
// пополам — 27 коммитов из 28 уходили в «прочее» с пустой темой.
const rawLog = git(
  'log', `${base}..${head}`, '--no-merges', '--format=%x1e%H%x1f%s', '--name-only', '--',
);
const commits = [];
for (const chunk of rawLog.split('\x1e')) {
  const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) continue;
  const [sha, subject] = lines[0].split('\x1f');
  if (!sha) continue;
  commits.push({ sha, subject: subject ?? '', files: lines.length - 1 });
}

// Строки по файлам за весь день одним diff'ом: база → HEAD. Именно diff, а не сумма
// по коммитам — иначе файл, тронутый пять раз, посчитается пятикратно, и «сколько
// ушло на кабинет» превратится в «сколько раз коммитили кабинет».
const fileStats = [];
for (const line of git('diff', '--numstat', `${base}..${head}`).split('\n')) {
  const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/u);
  if (!m) continue;
  // «-» вместо числа — бинарник; строк у него нет, но файл тронут.
  fileStats.push({
    path: m[3].replace(/^.*\{.*=>\s*(.+)\}.*$/u, '$1'), // переименование: берём новый путь
    added: m[1] === '-' ? 0 : Number(m[1]),
    removed: m[2] === '-' ? 0 : Number(m[2]),
  });
}

const repo = repoMovement(commits);
const lines = linesByArea(fileStats);
const registry = registryMovement(
  jsonAt(base, 'docs/tasks/registry.json') ?? { tasks: [] },
  jsonAt(head, 'docs/tasks/registry.json') ?? { tasks: [] },
);
const truth = truthMovement(
  jsonAt(base, 'docs/truth/registry.json') ?? { tokens: [] },
  jsonAt(head, 'docs/truth/registry.json') ?? { tokens: [] },
);

const md = renderReport({ date, base, head, repo, lines, registry, truth });

if (argv.includes('--stdout')) {
  console.log(md);
  process.exit(0);
}

const livePath = resolve(repoRoot, 'docs/DAILY_AUDIT.md');
writeFileSync(livePath, `${md}\n`, 'utf8');

// Датированный снимок: живой файл перезапишется завтра, вещдок дня должен остаться.
const archDir = resolve(repoRoot, 'docs/archive/daily-day', date);
mkdirSync(archDir, { recursive: true });
writeFileSync(join(archDir, 'audit.md'), `${md}\n`, 'utf8');

console.log(`docs/DAILY_AUDIT.md + docs/archive/daily-day/${date}/audit.md`);
console.log(
  `${repo.total} коммитов · реестр ${registry.counts.wasTotal}→${registry.counts.total} · ` +
    `граф ${truth.counts.wasTotal}→${truth.counts.total}`,
);
