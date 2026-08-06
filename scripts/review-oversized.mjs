#!/usr/bin/env node
/**
 * `yarn review:oversized` — очередь oversized-коммитов на точечное ревью.
 *
 * Глагол тонкий: здесь git, ФС, вывод и код возврата. Все решения — в чистом ядре
 * `scripts/lib/review-oversized-queue.mjs`, и потому проверяемы зубами, а не глазом.
 *
 * ПОВОД. Строка 2 топ-10 на 02.08 велит ревьюить oversized по одному в день. Двенадцать дней
 * «какой сегодня» решалось памятью: замер 02.08 — 185 oversized с 20.07, артефакт ревью есть
 * у 17, без него 168. Очередь, которую никто не считает, не очередь.
 *
 * Коды возврата: 0 — очередь пуста · 1 — ЕСТЬ КОГО РЕВЬЮИТЬ, и это не сбой глагола. Единица —
 * состояние дома, ровно как у `scripts:orphans`.
 *
 * Usage: node scripts/review-oversized.mjs [--since <date>] [--limit N] [--include-docs] [--json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildQueue, formatQueue } from './lib/review-oversized-queue.mjs';
// Имя контекста статуса — из единственного источника (гейт его и ставит): вторая копия
// строки разошлась бы молча, как это уже было с меткой среза в review-gate.
import { REVIEW_STATUS_CONTEXT } from './lib/review-gate.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Артефакт точечного ревью PR — образец имени задан деревом, а не выдуман здесь. */
const reviewArtifactRel = (pr) => `docs/discussions/pr-${pr}-code-review.md`;

function parseArgs(argv) {
  const out = {
    since: '2026-07-20', limit: 10, includeDocs: false, json: false, ref: 'origin/main',
    // Голова очереди, у которой спрашиваются commit-статусы. Не вся очередь: 133 запроса к
    // gh сделали бы прибор дороже пользы, а ревьюится «по одному в день» — важна голова.
    statusProbe: 20,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--since') out.since = argv[++i] ?? out.since;
    else if (a === '--limit') out.limit = Number(argv[++i]) || out.limit;
    else if (a === '--ref') out.ref = argv[++i] ?? out.ref;
    else if (a === '--include-docs') out.includeDocs = true;
    else if (a === '--json') out.json = true;
    else if (a === '--status-probe') out.statusProbe = Math.max(0, Number(argv[++i]) || 0);
    else if (a === '--no-status') out.statusProbe = 0;
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return out;
}

const git = (args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/**
 * Номер PR из заголовка коммита — ПОСЛЕДНЯЯ скобка `(#N)`, а не первая.
 *
 * Так его ставит squash-мердж GitHub, и разница не теоретическая: заголовок
 * `feat(cowork): … (#1499) (#1515)` несёт сначала ссылку на иссью, и лишь потом номер PR.
 * Первая редакция брала первую скобку — и первый же живой прогон 02.08 назвал бы артефакт
 * `pr-1499-code-review.md` вместо `pr-1515`, после чего снятие с очереди по артефакту не
 * срабатывало бы никогда. Поймано прогоном, а не рассуждением.
 */
export function prOf(subject) {
  const all = [...String(subject ?? '').matchAll(/\(#(\d+)\)/gu)];
  return all.length === 0 ? null : all[all.length - 1][1];
}

/**
 * Коммиты ствола с их файлами. Коммит без номера PR в очередь не попадает, и это сказано
 * числом, а не молчанием (см. `withoutPr` в отчёте).
 */
function collectCommits({ since, ref }) {
  const log = git(['log', '--no-merges', `--since=${since}`, '--format=%H\t%ad\t%s', '--date=short', ref]);
  const commits = [];
  let withoutPr = 0;

  for (const line of log.trim().split('\n')) {
    if (!line.trim()) continue;
    const [sha, date, subject] = line.split('\t');
    const pr = prOf(subject);
    if (pr === null) {
      withoutPr += 1;
      continue;
    }
    let numstat = '';
    try {
      numstat = git(['show', '--numstat', '--format=', sha]);
    } catch {
      // Коммит, который git не показывает (подмодуль, порча), пропускается — но молча он не
      // исчезает: он не попадает и в знаменатель, и это видно по числу рассмотренных.
      continue;
    }
    const files = [];
    for (const l of numstat.trim().split('\n')) {
      const p = l.split('\t');
      if (p.length < 3) continue;
      files.push({ path: p[2], changedLines: (Number(p[0]) || 0) + (Number(p[1]) || 0) });
    }
    commits.push({ pr, sha, date, subject, files });
  }
  return { commits, withoutPr };
}

/**
 * Commit-статусы `review/teamlead` у первых `limit` PR очереди.
 *
 * Снимает с очереди ТОЛЬКО `SUCCESS` (слово владельца 05.08): `FAILURE` гейт ставит и при
 * вердикте BLOCK, и при протухшем вердикте — снаружи они неразличимы, и считать такие
 * «рассмотренными» значило бы выдать непроверенное за проверенное. Их прибор называет
 * отдельной строкой как требующие руки.
 *
 * @param {string[]} prs номера PR в порядке очереди
 * @param {number} limit сколько голов опросить (0 — не ходить в сеть вовсе)
 * @returns {{statusReviewed: string[], statusFailure: string[]}}
 */
export function probeStatuses(prs, limit) {
  const out = { statusReviewed: [], statusFailure: [] };
  if (!Number.isFinite(limit) || limit <= 0) return out;
  for (const pr of prs.slice(0, limit)) {
    let roll;
    try {
      // stderr дочернего процесса ГЛУШИТСЯ намеренно: неразрешимый номер PR (форк, чужой
      // репозиторий, удалённый PR) — штатный случай опроса, а не событие прибора. Иначе
      // «Could not resolve to a PullRequest» печатается ПЕРЕД отчётом и читается как
      // сбой самой очереди (живой прогон 06.08, PR #1561).
      const raw = execFileSync('gh', ['pr', 'view', String(pr), '--json', 'statusCheckRollup'], {
        cwd: repoRoot, encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'ignore'],
      });
      roll = JSON.parse(raw).statusCheckRollup ?? [];
    } catch {
      continue; // сеть/доступ/удалённый PR — молчим о снятии, а не выдумываем его
    }
    const st = roll.find((c) => (c.context ?? c.name) === REVIEW_STATUS_CONTEXT);
    if (!st) continue;
    const state = String(st.state ?? st.conclusion ?? '').toUpperCase();
    if (state === 'SUCCESS') out.statusReviewed.push(String(pr));
    else if (state === 'FAILURE' || state === 'ERROR') out.statusFailure.push(String(pr));
  }
  return out;
}

function main(argv) {
  const cli = parseArgs(argv);
  const { commits, withoutPr } = collectCommits(cli);

  // Уже проревьюированные — по наличию артефакта в дереве. Читает ФС глагол, ядро получает
  // готовый список значением: предикат обязан оставаться воспроизводимым без рабочей копии.
  const reviewed = [...new Set(commits.map((c) => c.pr))].filter((pr) =>
    existsSync(join(repoRoot, reviewArtifactRel(pr))),
  );

  // Порт ствола (шот B): какие артефакты ревью отслеживаются git. Ядро получает Set
  // значением и о VCS не знает. Сбой git не роняет очередь — порт остаётся null, и прибор
  // о слепоте честно НЕ судит, вместо того чтобы соврать «слепоты нет».
  let trackedReviewed = null;
  try {
    const tracked = git(['ls-files', '--', 'docs/discussions/pr-*-code-review.md']);
    const trackedPrs = new Set(
      tracked.split('\n').map((f) => /pr-(\d+)-code-review\.md$/u.exec(f)?.[1]).filter(Boolean),
    );
    trackedReviewed = reviewed.filter((pr) => trackedPrs.has(String(pr)));
  } catch {
    /* порт не подключился — hostLocalReviewed останется null */
  }

  // Порт общего следа (блок e2): commit-status `review/teamlead` ставит сам шип-гейт, и он
  // виден на любом клоне — в отличие от артефакта ревью (.gitignore). Спрашиваем ГОЛОВУ
  // очереди, посчитанной по артефактам: у хвоста цена запросов выше пользы. Сбой сети/gh
  // прибор не роняет — списки остаются пустыми, и о снятии по статусу он честно не судит.
  const firstPass = buildQueue(commits, { reviewed, includeDocs: cli.includeDocs, trackedReviewed });
  const { statusReviewed, statusFailure } = probeStatuses(
    firstPass.queue.map((c) => c.pr).filter(Boolean),
    cli.statusProbe,
  );

  const result = buildQueue(commits, {
    reviewed,
    statusReviewed,
    statusFailure,
    includeDocs: cli.includeDocs,
    trackedReviewed,
  });

  if (cli.json) {
    process.stdout.write(`${JSON.stringify({ ...result, withoutPr, since: cli.since }, null, 2)}\n`);
    return result.queue.length === 0 ? 0 : 1;
  }

  const lines = formatQueue(result, { limit: cli.limit });
  if (withoutPr > 0) {
    lines.push(`  (вне разбора ${withoutPr} коммит(ов) без номера PR в заголовке — точечное ревью адресуется PR)`);
  }
  if (result.queue.length > 0) {
    // Наклонение изъявительное, а не повелительное (разбор Ожегова 02.08): глагол называется
    // «предъяви очередь», и назначать сегодняшний день читателю он не вправе — он показывает
    // голову и образец имени, а решение остаётся за человеком.
    const head = result.queue[0];
    lines.push(`\n→ голова очереди: #${head.pr}`);
    lines.push(`  артефакт по образцу: ${reviewArtifactRel(head.pr)}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
  return result.queue.length === 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('review-oversized.mjs')) {
  process.exit(main(process.argv.slice(2)));
}

export { collectCommits, parseArgs, reviewArtifactRel };
