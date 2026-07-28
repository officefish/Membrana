/**
 * Миграция журналов в архив подсознания — P5/P5b стройки (вердикт C6,
 * ратифицирован 28.07): day-zero снапшот текущих md + ограниченный backfill
 * окна потерь из git-истории. Provenance записи — реальный указатель источника
 * из журнала; маркер миграции — поле source: 'migration-snapshot' |
 * 'git-restore@<sha>' (различимы по C6; дедуп по id).
 *
 * Чистые разборы + git-чтение через инъекцию (тестируемо без репо).
 */
import { execFileSync } from 'node:child_process';

import { appendArchive, readArchive } from './archive-append.mjs';
import { HOMES } from './archive-schema.mjs';

/** Класс записи из русской метки журнала. Неизвестное — честно routine. */
const KIND_TO_CLASS = Object.freeze({
  'позиция': 'position', 'инсайт': 'insight', 'прецедент': 'precedent',
});

/**
 * Разбор живого md-журнала персоны: `### <дата> · <тип> · <slug>` + цитата `> …`
 * + строка `— источник: \`<provenance>\``. Чистая.
 * @param {string} text
 * @param {string} personaId
 * @returns {Array<{id: string, ts: string, class: string, slug: string, text: string, provenance: string}>}
 */
export function parseJournalMd(text, personaId) {
  const entries = [];
  const lines = String(text ?? '').split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(\d{4}-\d{2}-\d{2})\s+·\s+([^·]+?)\s+·\s+(.+?)\s*$/u);
    if (h) {
      if (cur) entries.push(cur);
      const kind = h[2].trim();
      cur = {
        ts: h[1],
        class: KIND_TO_CLASS[kind] ?? 'routine',
        slug: h[3].trim().replace(/\s+·\s+📌.*$/u, ''),
        text: '',
        provenance: '',
      };
      cur.id = `${personaId}-${cur.ts}-${cur.slug}`;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('> ')) cur.text += (cur.text ? ' ' : '') + line.slice(2).trim();
    const src = line.match(/^—\s+источник:\s+`([^`]+)`/u);
    if (src) cur.provenance = src[1];
  }
  if (cur) entries.push(cur);
  return entries.filter((e) => e.text);
}

/** Запись журнала → ArchiveRecord (verbatim; provenance — указатель, source — маркер). */
export function toArchiveRecord(entry, personaId, sourceMarker) {
  return {
    id: entry.id,
    personaId,
    ts: entry.ts,
    provenance: entry.provenance || `journal:${personaId}#${entry.slug}`,
    source: sourceMarker,
    kind: 'verbatim',
    text: entry.text,
    class: entry.class,
  };
}

/**
 * Day-zero снапшот персоны: текущий md → архив (пропуская уже существующие id).
 * @returns {{appended: number, skipped: number, problems: string[]}}
 */
export function dayZeroSnapshot(repoRoot, personaId, mdText) {
  const entries = parseJournalMd(mdText, personaId);
  const existing = new Set(readArchive(repoRoot, personaId).records.map((r) => r.id));
  let appended = 0;
  let skipped = 0;
  const problems = [];
  for (const e of entries) {
    if (existing.has(e.id)) { skipped += 1; continue; }
    const r = appendArchive(repoRoot, toArchiveRecord(e, personaId, 'migration-snapshot'));
    if (r.ok) appended += 1;
    else problems.push(`${e.id}: ${r.problems.join('; ')}`);
  }
  return { appended, skipped, problems };
}

/**
 * Backfill окна потерь: исторические версии md из git (по --before границе),
 * записи, которых нет ни в текущем md, ни в архиве, — восстановить с
 * source='git-restore@<sha>'. Git-чтение инъекцией (default — execFileSync).
 * @param {string} repoRoot
 * @param {string} personaId
 * @param {{before: string, gitShow?: (ref: string, path: string) => string|null, gitSha?: (before: string, path: string) => string|null}} opts
 */
export function backfillWindow(repoRoot, personaId, opts) {
  const rel = HOMES.projection(personaId);
  const gitSha = opts.gitSha ?? ((before, path) => {
    try {
      return execFileSync('git', ['log', '-1', '--format=%H', `--before=${before}`, '--', path], { cwd: repoRoot, encoding: 'utf8' }).trim() || null;
    } catch { return null; }
  });
  const gitShow = opts.gitShow ?? ((ref, path) => {
    try {
      return execFileSync('git', ['show', `${ref}:${path}`], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    } catch { return null; }
  });

  const sha = gitSha(opts.before, rel);
  if (!sha) return { appended: 0, skipped: 0, problems: [`нет коммита md до ${opts.before}`], sha: null };
  const oldText = gitShow(sha, rel);
  if (oldText == null) return { appended: 0, skipped: 0, problems: [`git show ${sha.slice(0, 8)} не отдал ${rel}`], sha };

  const existing = new Set(readArchive(repoRoot, personaId).records.map((r) => r.id));
  let appended = 0;
  let skipped = 0;
  const problems = [];
  for (const e of parseJournalMd(oldText, personaId)) {
    if (existing.has(e.id)) { skipped += 1; continue; }
    const r = appendArchive(repoRoot, toArchiveRecord(e, personaId, `git-restore@${sha.slice(0, 12)}`));
    if (r.ok) appended += 1;
    else problems.push(`${e.id}: ${r.problems.join('; ')}`);
  }
  return { appended, skipped, problems, sha };
}
