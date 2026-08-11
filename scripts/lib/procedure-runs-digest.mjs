/**
 * procedure-runs-digest — первый читатель ленты журнала прогонов (#1861, п.1 #1626).
 *
 * Кристалл `reader-before-next-carrier` (owner, 01.08): носитель без читателя —
 * то, о чём никто не вспомнит. Лента docs/procedure-runs/trail/*.jsonl пишется
 * механикой с 03–04.08; этот модуль — чистая сводка по пяти опорам: прогоны,
 * исходы, сироты, непогашенные трения. Ноль ФС и сети — records[] на входе.
 *
 * Честность нулей: опора без записей — строка «0 прогонов», не отсутствие строки.
 */
import { ORPHANED_GAP, VALID_STATUSES } from './procedure-run-journal.mjs';

/** Пять опор витрины (#1626); список — параметр, не константа потребителя. */
export const FIVE_PILLARS = Object.freeze([
  'membrana-local-sprint',
  'ritual-day',
  'ritual-evening',
  'meeting',
  'one-shot',
]);

/** Исходы, которые сводка показывает колонками (порядок фиксирован). */
export const OUTCOME_STATUSES = Object.freeze(['pass', 'fail', 'blocked', 'skipped']);

/**
 * Запись — исход прогона? Открытия (`open`) и поправки трений (`friction-amend`)
 * исходами не являются; записи без runPhase — закрытые точечные (история до 03.08).
 * @param {object} rec
 */
function isOutcomeRecord(rec) {
  return rec?.runPhase === 'close' || rec?.runPhase === undefined;
}

/**
 * @typedef {object} PillarRow
 * @property {string} procedureId
 * @property {number} runs уникальные runId в окне
 * @property {number} records все записи опоры в окне
 * @property {Record<string, number>} outcomes pass/fail/blocked/skipped
 * @property {number} orphans close-записи с gap `orphaned` (ленивое закрытие)
 * @property {number} frictionsTotal трения, заявленные записями окна
 * @property {number} frictionsUnresolved трения без корня (root не дозаписан амандментом)
 */

/**
 * Чистая сводка по опорам.
 *
 * @param {object[]} records записи лент (уже прочитанные)
 * @param {{ pillars?: readonly string[], since?: string | number, until?: string | number }} [opts]
 *   окно [since, until] по полю `at`; отсутствие границы — без среза с этой стороны
 * @returns {{
 *   window: { since: string | null, until: string | null },
 *   pillars: PillarRow[],
 *   others: { procedureId: string, records: number }[],
 *   problems: string[],
 * }}
 */
export function buildProcedureRunsDigest(records, opts = {}) {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  const pillars = opts.pillars ?? FIVE_PILLARS;
  const sinceMs = opts.since !== undefined ? Date.parse(String(opts.since)) : -Infinity;
  const untilMs = opts.until !== undefined ? Date.parse(String(opts.until)) : Infinity;
  if (Number.isNaN(sinceMs) || Number.isNaN(untilMs)) {
    throw new Error('since/until: нечитаемая граница окна');
  }

  /** @type {string[]} */
  const problems = [];
  /** @type {object[]} */
  const windowed = [];
  records.forEach((rec, i) => {
    if (!rec || typeof rec !== 'object') {
      problems.push(`records[${i}]: не объект — пропущена`);
      return;
    }
    const t = Date.parse(rec.at);
    if (!Number.isFinite(t)) {
      problems.push(`records[${i}] (${rec.runId ?? '—'}): нечитаемый at — пропущена`);
      return;
    }
    if (t < sinceMs || t > untilMs) return;
    if (rec.status !== undefined && !VALID_STATUSES.has(rec.status)) {
      problems.push(`records[${i}] (${rec.runId ?? '—'}): статус «${rec.status}» вне словаря`);
      return;
    }
    windowed.push(rec);
  });

  // Амандменты окна: корень трения дозаписывается новой записью (append-only),
  // погашенность считается по паре (runId, sequence, frictionIndex).
  const amendedRoots = new Set();
  for (const rec of windowed) {
    const a = rec.runPhase === 'friction-amend' ? rec.amends : null;
    if (a && rec.root != null) {
      amendedRoots.add(`${a.runId}#${a.sequence}#${a.frictionIndex}`);
    }
  }

  /** @param {string} procedureId */
  const buildRow = (procedureId) => {
    const own = windowed.filter((r) => r.procedureId === procedureId);
    const outcomes = Object.fromEntries(OUTCOME_STATUSES.map((s) => [s, 0]));
    let orphans = 0;
    let frictionsTotal = 0;
    let frictionsUnresolved = 0;
    const runIds = new Set();
    for (const rec of own) {
      if (rec.runId) runIds.add(rec.runId);
      if (isOutcomeRecord(rec) && rec.status in outcomes) outcomes[rec.status] += 1;
      const gaps = rec.coverage?.gaps ?? [];
      if (Array.isArray(gaps) && gaps.includes(ORPHANED_GAP)) orphans += 1;
      if (Array.isArray(rec.friction)) {
        rec.friction.forEach((f, idx) => {
          frictionsTotal += 1;
          const amended = amendedRoots.has(`${rec.runId}#${rec.sequence}#${idx}`);
          if (f?.root == null && !amended) frictionsUnresolved += 1;
        });
      }
    }
    return {
      procedureId,
      runs: runIds.size,
      records: own.length,
      outcomes,
      orphans,
      frictionsTotal,
      frictionsUnresolved,
    };
  };

  const pillarRows = pillars.map(buildRow);

  /** @type {Map<string, number>} */
  const otherCounts = new Map();
  for (const rec of windowed) {
    const id = rec.procedureId ?? '—';
    if (pillars.includes(id)) continue;
    otherCounts.set(id, (otherCounts.get(id) ?? 0) + 1);
  }
  const others = [...otherCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([procedureId, count]) => ({ procedureId, records: count }));

  return {
    window: {
      since: Number.isFinite(sinceMs) && sinceMs !== -Infinity ? new Date(sinceMs).toISOString() : null,
      until: Number.isFinite(untilMs) && untilMs !== Infinity ? new Date(untilMs).toISOString() : null,
    },
    pillars: pillarRows,
    others,
    problems,
  };
}

/**
 * Markdown-таблица сводки. Нулевая опора — «0 прогонов» строкой, не молчание.
 *
 * @param {ReturnType<typeof buildProcedureRunsDigest>} digest
 * @param {{ title?: string }} [opts]
 * @returns {string}
 */
export function renderProcedureRunsDigest(digest, opts = {}) {
  const lines = [];
  lines.push(`# ${opts.title ?? 'Витрина пяти опор — журнал прогонов процедур'}`);
  lines.push('');
  const w = digest.window;
  lines.push(`Окно: ${w.since ?? '—'} → ${w.until ?? '—'}`);
  lines.push('');
  lines.push('| Опора | Прогоны | pass | fail | blocked | skipped | Сироты | Трения (непогашенные) |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const row of digest.pillars) {
    const o = row.outcomes;
    lines.push(
      `| ${row.procedureId} | ${row.runs === 0 ? '0 прогонов' : row.runs} | ${o.pass} | ${o.fail} | ${o.blocked} | ${o.skipped} | ${row.orphans} | ${row.frictionsTotal} (${row.frictionsUnresolved}) |`,
    );
  }
  if (digest.others.length > 0) {
    lines.push('');
    lines.push(
      `Вне пяти опор: ${digest.others.map((x) => `${x.procedureId} (${x.records})`).join(' · ')}`,
    );
  }
  if (digest.problems.length > 0) {
    lines.push('');
    lines.push('## Проблемы чтения ленты');
    lines.push('');
    for (const p of digest.problems) lines.push(`- ${p}`);
  }
  return `${lines.join('\n')}\n`;
}
