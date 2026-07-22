/**
 * Недельный отчёт бестиария (B4 / #883).
 * Пишет analysis/bestiary-run-YYYY-MM-DD.md; тренд vs прошлый снимок;
 * анти-молчун: Summary всегда; not-run ≠ clean.
 *
 * Engines — lens-bestiary / bestiary-audit; код в контейнер не копируем.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { aimBestiary, BESTIARY } from './lens-bestiary.mjs';
import {
  ORPHAN_RULESET,
  auditSpecimenCoverage,
  listSpecimenFiles,
} from './bestiary-audit.mjs';

export const WEEKLY_ANALYSIS_REL = 'docs/audit/bestiary/analysis';
export const RUN_FILE_RE = /^bestiary-run-(\d{4}-\d{2}-\d{2})\.md$/;

/**
 * @param {string} analysisDir abs
 * @returns {{date: string, path: string}[]}
 */
export function listWeeklyRunSnapshots(analysisDir) {
  if (!existsSync(analysisDir)) return [];
  return readdirSync(analysisDir)
    .map((name) => {
      const m = RUN_FILE_RE.exec(name);
      if (!m) return null;
      return { date: m[1], path: join(analysisDir, name) };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * @param {string} analysisDir
 * @param {string} currentDate YYYY-MM-DD
 * @returns {{date: string, path: string} | null}
 */
export function findPreviousWeeklySnapshot(analysisDir, currentDate) {
  const all = listWeeklyRunSnapshots(analysisDir);
  const earlier = all.filter((s) => s.date < currentDate);
  return earlier.length ? earlier[earlier.length - 1] : null;
}

/**
 * Вытащить счётчики по классам из уже записанного отчёта.
 * @param {string} markdown
 * @returns {{byClass: Record<string, number>, findingsTotal: number, objectsScanned: number, lensStatus: 'ran'|'not-run'|null}}
 */
export function parseWeeklyRunMarkdown(markdown) {
  const byClass = Object.fromEntries(BESTIARY.map((b) => [b.defectClass, 0]));
  let findingsTotal = 0;
  let objectsScanned = 0;
  /** @type {'ran'|'not-run'|null} */
  let lensStatus = null;

  const statusM = markdown.match(/\|\s*Lens status\s*\|\s*(ran|not-run)\s*\|/i);
  if (statusM) lensStatus = /** @type {'ran'|'not-run'} */ (statusM[1].toLowerCase());

  const objectsM = markdown.match(/\|\s*Objects scanned\s*\|\s*(\d+)\s*\|/i);
  if (objectsM) objectsScanned = Number(objectsM[1]);

  const totalM = markdown.match(/\|\s*Findings total\s*\|\s*(\d+)\s*\|/i);
  if (totalM) findingsTotal = Number(totalM[1]);

  // Таблица Summary: | `class` | Label | hits | …
  for (const b of BESTIARY) {
    const re = new RegExp(
      `\\|\\s*\`${b.defectClass}\`\\s*\\|[^|]*\\|\\s*(\\d+)\\s*\\|`,
      'i',
    );
    const m = markdown.match(re);
    if (m) byClass[b.defectClass] = Number(m[1]);
  }

  return { byClass, findingsTotal, objectsScanned, lensStatus };
}

/**
 * @param {Record<string, number>} curr
 * @param {Record<string, number> | null} prev
 */
export function computeTrend(curr, prev) {
  return BESTIARY.map((b) => {
    const c = curr[b.defectClass] ?? 0;
    const p = prev ? (prev[b.defectClass] ?? 0) : null;
    return {
      defectClass: b.defectClass,
      label: b.label,
      current: c,
      previous: p,
      delta: p === null ? null : c - p,
    };
  });
}

/**
 * Собрать объекты прогона: все specimen .mjs (+ опциональные rel-пути).
 * @param {string} repoRoot
 * @param {{extraRels?: string[]}} [opts]
 */
export function collectWeeklyObjects(repoRoot, opts = {}) {
  const specimensRoot = join(repoRoot, 'docs', 'audit', 'bestiary', 'specimens');
  /** @type {{path: string, text: string|null}[]} */
  const objects = [];

  for (const beast of BESTIARY) {
    for (const abs of listSpecimenFiles(specimensRoot, beast.defectClass)) {
      const rel = relative(repoRoot, abs).replace(/\\/g, '/');
      objects.push({
        path: rel,
        text: existsSync(abs) ? readFileSync(abs, 'utf8') : null,
      });
    }
  }

  for (const rel of opts.extraRels ?? []) {
    const norm = rel.replace(/\\/g, '/');
    if (objects.some((o) => o.path === norm)) continue;
    const abs = join(repoRoot, norm);
    objects.push({
      path: norm,
      text: existsSync(abs) ? readFileSync(abs, 'utf8') : null,
    });
  }

  return objects;
}

/**
 * @param {string} repoRoot
 * @param {{
 *   date?: string,
 *   headSha?: string,
 *   extraRels?: string[],
 *   ruleset?: {consumersOf:(n:string)=>number, readersOf:(a:string)=>number},
 *   analysisDir?: string,
 * }} [opts]
 */
export function buildWeeklyReport(repoRoot, opts = {}) {
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const headSha = opts.headSha ?? '—';
  const analysisDir = opts.analysisDir ?? join(repoRoot, ...WEEKLY_ANALYSIS_REL.split('/'));
  const ruleset = opts.ruleset ?? ORPHAN_RULESET;

  const objects = collectWeeklyObjects(repoRoot, { extraRels: opts.extraRels });
  const readable = objects.filter((o) => o.text !== null && o.text !== undefined);
  const missing = objects.filter((o) => o.text === null || o.text === undefined);

  /** @type {'ran'|'not-run'} */
  let lensStatus = 'not-run';
  /** @type {ReturnType<typeof aimBestiary> | null} */
  let aim = null;

  if (readable.length > 0) {
    aim = aimBestiary(
      readable.map((o) => ({ path: o.path, text: /** @type {string} */ (o.text) })),
      ruleset,
    );
    lensStatus = 'ran';
  }

  const byClass = Object.fromEntries(BESTIARY.map((b) => [b.defectClass, 0]));
  if (aim) {
    for (const f of aim.findings) {
      byClass[f.defectClass] = (byClass[f.defectClass] ?? 0) + 1;
    }
  }

  const coverage = auditSpecimenCoverage(repoRoot, { ruleset });
  const prevSnap = findPreviousWeeklySnapshot(analysisDir, date);
  /** @type {ReturnType<typeof parseWeeklyRunMarkdown> | null} */
  let prevParsed = null;
  if (prevSnap) {
    prevParsed = parseWeeklyRunMarkdown(readFileSync(prevSnap.path, 'utf8'));
  }
  const trend = computeTrend(byClass, prevParsed?.byClass ?? null);

  const findingsTotal = aim ? aim.findings.length : 0;
  // Анти-молчун охотника: при живых specimens и ran — 0 findings = красный сигнал
  const silentHunter =
    lensStatus === 'ran' &&
    coverage.rows.some((r) => r.specimenFiles.length > 0) &&
    findingsTotal === 0;

  return {
    date,
    headSha,
    lensStatus,
    objectsScanned: objects.length,
    objectsReadable: readable.length,
    objectsMissing: missing.map((o) => o.path),
    byClass,
    findings: aim?.findings ?? [],
    matrix: aim?.matrix ?? {},
    coverage,
    trend,
    previous: prevSnap
      ? { date: prevSnap.date, path: relative(repoRoot, prevSnap.path).replace(/\\/g, '/') }
      : null,
    silentHunter,
    ok: lensStatus === 'ran' && !silentHunter && coverage.ok,
  };
}

/**
 * Markdown отчёта. **Всегда** содержит секцию `## Summary` (анти-молчун аудитора).
 * @param {ReturnType<typeof buildWeeklyReport>} report
 */
export function formatWeeklyReportMarkdown(report) {
  const lines = [];
  lines.push(`# bestiary-run-${report.date}`);
  lines.push('');
  lines.push('## Meta');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Date | ${report.date} |`);
  lines.push(`| Head SHA | ${report.headSha} |`);
  lines.push('| Source | yarn bestiary:weekly |');
  lines.push('| Engines | `scripts/lib/lens-bestiary.mjs` |');
  lines.push(`| Lens status | ${report.lensStatus} |`);
  lines.push(`| Objects scanned | ${report.objectsScanned} |`);
  lines.push(`| Objects readable | ${report.objectsReadable} |`);
  lines.push(`| Findings total | ${report.findings.length} |`);
  if (report.previous) {
    lines.push(`| Previous snapshot | \`${report.previous.path}\` (${report.previous.date}) |`);
  } else {
    lines.push('| Previous snapshot | — (нет предыдущего снимка) |');
  }
  lines.push('');

  // ── анти-молчун: Summary обязателен всегда ────────────────────────────
  lines.push('## Summary');
  lines.push('');
  if (report.lensStatus === 'not-run') {
    lines.push(
      `**Вердикт:** \`not-run\` — линза не отработала (объектов с текстом: ${report.objectsReadable}). ` +
        '`not-run` ≠ `clean`: пустой/отсутствующий прогон не выдаётся за чистоту.',
    );
  } else if (report.silentHunter) {
    lines.push(
      `**Вердикт:** silent-hunter — прогнано ${report.objectsReadable} объектов, findings=0 при живых specimens. ` +
        'Аудитор-молчун (красный).',
    );
  } else if (report.findings.length === 0) {
    lines.push(
      `**Вердикт:** clean — прогнано ${report.objectsReadable} объектов, findings=0. ` +
        '(линза отработала; это не not-run.)',
    );
  } else {
    lines.push(
      `**Вердикт:** ran — прогнано ${report.objectsReadable} объектов, findings=${report.findings.length}.`,
    );
  }
  lines.push('');
  lines.push('> Контракт аудитора: видимый Summary всегда; `not-run` ≠ `clean`; нет silent-green пустого отчёта.');
  lines.push('');

  lines.push('| defectClass | Label | Hits | Δ vs prev | Coverage |');
  lines.push('|-------------|-------|:----:|:---------:|----------|');
  for (const row of report.trend) {
    const cov = report.coverage.rows.find((r) => r.defectClass === row.defectClass);
    const covMark = cov?.covered ? '✅' : cov?.specimenFiles.length ? '❌' : '—';
    const delta =
      row.delta === null ? '—' : row.delta > 0 ? `+${row.delta}` : String(row.delta);
    lines.push(
      `| \`${row.defectClass}\` | ${row.label} | ${row.current} | ${delta} | ${covMark} |`,
    );
  }
  const covered = report.coverage.rows.filter((r) => r.covered).length;
  lines.push('');
  lines.push(
    `**Покрытие specimens:** ${covered}/${report.coverage.rows.length}` +
      (report.coverage.ok ? '.' : ' — есть непокрытые классы.'),
  );
  lines.push('');

  lines.push('## Trend');
  lines.push('');
  if (!report.previous) {
    lines.push('Предыдущего снимка нет — базовая линия этой недели.');
  } else {
    lines.push(`Сравнение с \`${report.previous.path}\` (${report.previous.date}).`);
    lines.push('');
    lines.push('| defectClass | Previous | Current | Δ |');
    lines.push('|-------------|:--------:|:-------:|:-:|');
    for (const row of report.trend) {
      const p = row.previous === null ? '—' : String(row.previous);
      const d =
        row.delta === null ? '—' : row.delta > 0 ? `+${row.delta}` : String(row.delta);
      lines.push(`| \`${row.defectClass}\` | ${p} | ${row.current} | ${d} |`);
    }
  }
  lines.push('');

  if (report.objectsMissing.length) {
    lines.push('## Missing objects (not-run cells)');
    lines.push('');
    for (const p of report.objectsMissing) lines.push(`- \`${p}\` — файл не прочитан → not-run`);
    lines.push('');
  }

  lines.push('## Findings');
  lines.push('');
  if (report.lensStatus === 'not-run') {
    lines.push('_Линза не запускалась — список находок отсутствует (не «чисто»)._');
  } else if (report.findings.length === 0) {
    lines.push('_Находок нет (линза отработала)._');
  } else {
    const cap = 80;
    for (const f of report.findings.slice(0, cap)) {
      lines.push(`- [\`${f.defectClass}\`] ${f.locus} — ${f.evidence}`);
    }
    if (report.findings.length > cap) {
      lines.push(`- … ещё ${report.findings.length - cap}`);
    }
  }
  lines.push('');

  lines.push('## Anti-silent');
  lines.push('');
  lines.push('| Check | Result |');
  lines.push('|-------|--------|');
  lines.push('| Summary section present | ✅ |');
  lines.push(`| Lens status | \`${report.lensStatus}\` |`);
  lines.push(`| not-run conflated with clean | ${report.lensStatus === 'not-run' ? '❌ forbidden (labelled not-run)' : '✅ no'} |`);
  lines.push(`| Silent-hunter (0 findings on live specimens) | ${report.silentHunter ? '❌ yes' : '✅ no'} |`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} repoRoot
 * @param {ReturnType<typeof buildWeeklyReport>} report
 * @returns {string} abs path written
 */
export function writeWeeklyReport(repoRoot, report) {
  const dir = join(repoRoot, ...WEEKLY_ANALYSIS_REL.split('/'));
  mkdirSync(dir, { recursive: true });
  const abs = join(dir, `bestiary-run-${report.date}.md`);
  writeFileSync(abs, formatWeeklyReportMarkdown(report), 'utf8');
  return abs;
}
