/**
 * Канон, изменённый в стволе за 7 дней — вход вечернего протокола (#2682, вынесено из #2615 п.2).
 *
 * ПОВОД. 05–07.10 протокол три вечера подряд утверждал «ADR-0031 файлом в ствол не положен»,
 * хотя `docs/adr/ADR-0031-downgrade-archive.md` лежал в стволе с 05.10 (#2593, 66153f58).
 * Входы вечера — документы дня и git ЗА ДЕНЬ (`collectGitDaySummary`); файл, пришедший
 * накануне, для команды не существовал, и «чего нет» судилось по невидимому. #2681 ловит
 * такие утверждения постфактум (`feedback:claims`); этот модуль устраняет причину на входе.
 *
 * ЧТО СЧИТАЕТСЯ КАНОНОМ. Отдельной разметки «канон-документ» в репозитории нет; список ниже —
 * закрытый и с основанием каждой строки, а не «всё в docs/» (там же протоколы, снимки и
 * журналы, и блок утонул бы в шуме):
 *   - `docs/adr/**`        — решения (ADR, `membrana-adr`), ровно класс вещдока 05.10;
 *   - `docs/strategy/**`   — стратегия и веха горизонта (`RETURN_STRATEGY_*`, `day-horizon.json`);
 *   - `docs/procedures/**` — «канон манифеста — Р3 / docs/procedures/» (AGENTS.md);
 *   - `docs/*_REGULATION.md` — регламенты форматов (вечер, спринты, заседания);
 *   - `AGENTS.md`, `.cursorrules`, `.claude/CLAUDE.md` — нормы агентов («Read first»);
 *   - `docs/ARCHITECTURE.md`, `docs/WHITE_PAPER.md` — архитектура и цель (вход `plan:week`).
 *
 * Чистые функции (разбор вывода git, блок, отпечаток) + один сборщик с git-инъекцией.
 */
import { createHash } from 'node:crypto';

export const CANON_WINDOW_DAYS = 7;

/** Ключ в guard-строке readAt. Не обязательный (`EVENING_REQUIRED_KEYS` не растёт): см. шапку теста. */
export const CANON_READAT_KEY = 'CANON_CHANGES_7D';

export const CANON_PATHSPECS = Object.freeze([
  'docs/adr',
  'docs/strategy',
  'docs/procedures',
  // Журнал дежурств — датированные следы прогонов, а не канон процедуры.
  ':(exclude)docs/procedures/duty/**',
  ':(glob)docs/*_REGULATION.md',
  'AGENTS.md',
  '.cursorrules',
  '.claude/CLAUDE.md',
  'docs/ARCHITECTURE.md',
  'docs/WHITE_PAPER.md',
]);

const STATUS_LABEL = Object.freeze({ A: 'добавлен', M: 'изменён', D: 'удалён', R: 'переименован', C: 'скопирован' });

/** День начала окна: `today` минус `days` (ГГГГ-ММ-ДД, UTC). */
export function windowStart(today, days = CANON_WINDOW_DAYS) {
  const ms = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`windowStart: неверный день «${today}»`);
  return new Date(ms - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Разбор `git log --name-status --format=@@%H%x09%cI%x09%s`. Лог идёт от новых к старым,
 * поэтому первое вхождение пути — его последнее изменение в окне.
 *
 * @param {string} out
 * @returns {{path: string, status: string, sha: string, at: string, subject: string}[]}
 */
export function parseCanonLog(out) {
  const byPath = new Map();
  let commit = null;
  for (const raw of String(out ?? '').split(/\r?\n/u)) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (line.startsWith('@@')) {
      const [sha, at, ...subject] = line.slice(2).split('\t');
      commit = { sha, at, subject: subject.join('\t') };
      continue;
    }
    if (!commit) continue;
    const parts = line.split('\t');
    const status = parts[0]?.charAt(0);
    const path = parts.at(-1);
    if (!status || !path) continue;
    const seen = byPath.get(path);
    if (!seen) {
      byPath.set(path, { path, status, ...commit });
      continue;
    }
    // Файл и добавлен, и правлен в окне: последнее изменение — главная строка, а факт
    // «пришёл в ствол тогда-то» — рядом. Ровно вещдок 05.10: ADR-0031 добавлен #2593 и в тот
    // же день правлен #2594.
    if (status === 'A' && seen.status !== 'A') seen.added = { sha: commit.sha, at: commit.at };
  }
  return [...byPath.values()].sort((a, b) => b.at.localeCompare(a.at) || a.path.localeCompare(b.path));
}

/**
 * Блок промпта. Пустой список и нечитаемый ствол — словами: молчание неотличимо от «не
 * смотрели», а «не смотрели» запрещает утверждать отсутствие канона.
 *
 * @param {{entries: ReturnType<typeof parseCanonLog>|null, sinceDay: string, ref: string, head?: string|null, error?: string|null}} p
 */
export function formatCanonChangesBlock(p) {
  const head = p.head ? ` @${String(p.head).slice(0, 8)}` : '';
  const lines = [
    `## Канон, изменённый в стволе за ${CANON_WINDOW_DAYS} дней (с ${p.sinceDay}, ${p.ref}${head})`,
    '',
    'Факт ствола, а не дифф дня. Документ из этого списка ЕСТЬ в стволе (кроме «удалён»):',
    'утверждать о нём «не положен», «не в стволе», «долг положить файлом» нельзя.',
    'Чего нет в списке — значит, не менялось за окно, а НЕ «отсутствует»: проверять по стволу.',
    '',
  ];
  if (p.error) {
    lines.push(`(ствол не прочитан: ${p.error}) — утверждения об отсутствии канона в протоколе не делать.`);
  } else if (!p.entries || p.entries.length === 0) {
    lines.push(`(за ${CANON_WINDOW_DAYS} дней канон в стволе не менялся)`);
  } else {
    for (const e of p.entries) {
      const label = STATUS_LABEL[e.status] ?? e.status;
      const added = e.added ? ` (добавлен в окне ${e.added.at.slice(0, 10)}, ${e.added.sha.slice(0, 8)})` : '';
      lines.push(`- \`${e.path}\` — ${label} ${e.at.slice(0, 10)}, ${e.sha.slice(0, 8)}${added} — ${e.subject}`);
    }
  }
  return lines.join('\n');
}

/** Отпечаток списка — для readAt: тот же список ⟺ тот же отпечаток (порядок фиксирован). */
export function canonChangesDigest(entries) {
  const text = (entries ?? []).map((e) => `${e.status}\t${e.path}\t${e.sha}`).join('\n');
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Собрать вход. `git(args) → {ok, out}` — инъекция (тесты без репозитория).
 *
 * @param {{git: (args: string[]) => {ok: boolean, out: string}, today: string, days?: number}} p
 * @returns {{block: string, entries: ReturnType<typeof parseCanonLog>, ref: string, sinceDay: string,
 *   readAtEntry: {version: string|null, digest: string|null, versionAt?: string}}}
 */
export function collectCanonChanges(p) {
  const sinceDay = windowStart(p.today, p.days ?? CANON_WINDOW_DAYS);
  const hasOrigin = p.git(['rev-parse', '--verify', '--quiet', 'origin/main']);
  const ref = hasOrigin.ok && hasOrigin.out.trim() ? 'origin/main' : 'HEAD';
  const headR = p.git(['log', '-1', '--format=%H%x09%cI', ref]);
  const [head, headAt] = headR.ok ? headR.out.trim().split('\t') : [null, null];
  const log = p.git([
    'log',
    ref,
    `--since=${sinceDay}T00:00:00Z`,
    // Верхняя граница — конец дня протокола: без неё прогон за прошлый день видел будущее.
    `--until=${p.today}T23:59:59Z`,
    '--name-status',
    '--format=@@%H%x09%cI%x09%s',
    '--',
    ...CANON_PATHSPECS,
  ]);
  if (!log.ok) {
    const error = log.out.split('\n')[0] || 'git недоступен';
    return {
      block: formatCanonChangesBlock({ entries: null, sinceDay, ref, head, error }),
      entries: [],
      ref,
      sinceDay,
      readAtEntry: { version: head ?? null, digest: null },
    };
  }
  const entries = parseCanonLog(log.out);
  return {
    block: formatCanonChangesBlock({ entries, sinceDay, ref, head }),
    entries,
    ref,
    sinceDay,
    // version — вершина ствола, по которой собран список; versionAt — её время (свежесть #2438).
    readAtEntry: {
      version: head ?? null,
      digest: canonChangesDigest(entries),
      ...(headAt ? { versionAt: headAt } : {}),
    },
  };
}
