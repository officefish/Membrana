/**
 * B4: недельный отчёт — Summary всегда; not-run ≠ clean; тренд vs снимок.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { BESTIARY } from './lib/lens-bestiary.mjs';
import {
  buildWeeklyReport,
  computeTrend,
  findPreviousWeeklySnapshot,
  formatWeeklyReportMarkdown,
  listWeeklyRunSnapshots,
  parseWeeklyRunMarkdown,
  writeWeeklyReport,
} from './lib/bestiary-weekly.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Минимальный specimens-каркас под BESTIARY (silent даёт finding). */
function seedSpecimens(tmpRoot) {
  for (const b of BESTIARY) {
    const d = join(tmpRoot, 'docs', 'audit', 'bestiary', 'specimens', b.defectClass);
    mkdirSync(d, { recursive: true });
    const body =
      b.defectClass === 'silent'
        ? '// specimen: weekly\ntry { f(); } catch {}\n'
        : `// specimen: weekly ${b.defectClass}\nexport function orphan_${b.defectClass.replace(/-/g, '_')}() {}\n`;
    writeFileSync(join(d, 's.mjs'), body, 'utf8');
  }
}

describe('bestiary weekly report (B4)', () => {
  test('formatWeeklyReportMarkdown всегда содержит ## Summary', () => {
    const report = buildWeeklyReport(root, {
      date: '2099-01-01',
      headSha: 'deadbeef',
    });
    const md = formatWeeklyReportMarkdown(report);
    assert.match(md, /^## Summary$/m);
    assert.match(md, /not-run` ≠ `clean/);
    assert.match(md, /Source \| yarn bestiary:weekly/);
    for (const b of BESTIARY) assert.match(md, new RegExp(`\`${b.defectClass}\``));
  });

  test('живой прогон: lens ran, findings > 0, ok', () => {
    const report = buildWeeklyReport(root, {
      date: '2099-01-02',
      headSha: 'abc',
    });
    assert.equal(report.lensStatus, 'ran');
    assert.ok(report.objectsReadable >= BESTIARY.length);
    assert.ok(report.findings.length > 0, '0 findings при specimens = молчун');
    assert.equal(report.silentHunter, false);
    assert.equal(report.ok, true);
    const md = formatWeeklyReportMarkdown(report);
    assert.match(md, /\|\s*Lens status\s*\|\s*ran\s*\|/);
    assert.match(md, /## Anti-silent/);
  });

  test('анти-молчун: not-run не выдаётся за clean', () => {
    const report = {
      date: '2099-01-03',
      headSha: '—',
      lensStatus: /** @type {const} */ ('not-run'),
      objectsScanned: 0,
      objectsReadable: 0,
      objectsMissing: [],
      byClass: Object.fromEntries(BESTIARY.map((b) => [b.defectClass, 0])),
      findings: [],
      matrix: {},
      coverage: {
        rows: BESTIARY.map((b) => ({
          defectClass: b.defectClass,
          label: b.label,
          specimenFiles: [],
          hits: 0,
          covered: false,
          findings: [],
        })),
        findings: [],
        uncovered: BESTIARY.map((b) => ({ defectClass: b.defectClass, label: b.label })),
        ok: false,
        specimensRoot: 'docs/audit/bestiary/specimens',
      },
      trend: computeTrend(
        Object.fromEntries(BESTIARY.map((b) => [b.defectClass, 0])),
        null,
      ),
      previous: null,
      silentHunter: false,
      ok: false,
    };
    const md = formatWeeklyReportMarkdown(report);
    assert.match(md, /^## Summary$/m);
    assert.match(md, /\*\*Вердикт:\*\* `not-run`/);
    assert.doesNotMatch(md, /\*\*Вердикт:\*\* clean/);
    assert.match(md, /не выдаётся за чистоту/);
  });

  test('list/find previous snapshot + parse + trend Δ', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bestiary-weekly-'));
    try {
      writeFileSync(
        join(dir, 'bestiary-run-2026-07-01.md'),
        [
          '# bestiary-run-2026-07-01',
          '',
          '## Meta',
          '',
          '| Field | Value |',
          '|-------|-------|',
          '| Lens status | ran |',
          '| Objects scanned | 5 |',
          '| Findings total | 10 |',
          '',
          '## Summary',
          '',
          '| defectClass | Label | Hits | Δ vs prev | Coverage |',
          '|-------------|-------|:----:|:---------:|----------|',
          ...BESTIARY.map(
            (b, i) => `| \`${b.defectClass}\` | ${b.label} | ${i + 1} | — | ✅ |`,
          ),
          '',
        ].join('\n'),
        'utf8',
      );
      writeFileSync(join(dir, 'bestiary-run-2026-07-08.md'), '# later\n## Summary\n', 'utf8');
      writeFileSync(join(dir, '.gitkeep'), '', 'utf8');

      const snaps = listWeeklyRunSnapshots(dir);
      assert.equal(snaps.length, 2);
      assert.equal(snaps[0].date, '2026-07-01');

      const prev = findPreviousWeeklySnapshot(dir, '2026-07-15');
      assert.ok(prev);
      assert.equal(prev.date, '2026-07-08');

      const prevOfSecond = findPreviousWeeklySnapshot(dir, '2026-07-08');
      assert.ok(prevOfSecond);
      assert.equal(prevOfSecond.date, '2026-07-01');

      const parsed = parseWeeklyRunMarkdown(
        readFileSync(join(dir, 'bestiary-run-2026-07-01.md'), 'utf8'),
      );
      assert.equal(parsed.lensStatus, 'ran');
      assert.equal(parsed.objectsScanned, 5);
      assert.equal(parsed.byClass.silent, 1);

      const curr = Object.fromEntries(BESTIARY.map((b, i) => [b.defectClass, i + 2]));
      const trend = computeTrend(curr, parsed.byClass);
      assert.equal(trend[0].delta, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('writeWeeklyReport пишет analysis/bestiary-run-DATE.md с Summary', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'bestiary-weekly-root-'));
    try {
      seedSpecimens(tmpRoot);
      const built = buildWeeklyReport(tmpRoot, {
        date: '2099-06-15',
        headSha: 'fff',
      });
      const path = writeWeeklyReport(tmpRoot, built);
      assert.match(path.replace(/\\/g, '/'), /bestiary-run-2099-06-15\.md$/);
      const md = readFileSync(path, 'utf8');
      assert.match(md, /^## Summary$/m);
      assert.match(md, /Lens status/);
      assert.match(md, /yarn bestiary:weekly/);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('тренд подхватывает предыдущий снимок в analysis/', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'bestiary-weekly-trend-'));
    try {
      seedSpecimens(tmpRoot);
      mkdirSync(join(tmpRoot, 'docs', 'audit', 'bestiary', 'analysis'), {
        recursive: true,
      });
      const first = buildWeeklyReport(tmpRoot, { date: '2026-07-01', headSha: 'a' });
      writeWeeklyReport(tmpRoot, first);
      const second = buildWeeklyReport(tmpRoot, { date: '2026-07-08', headSha: 'b' });
      assert.ok(second.previous);
      assert.equal(second.previous.date, '2026-07-01');
      const md = formatWeeklyReportMarkdown(second);
      assert.match(md, /## Trend/);
      assert.match(md, /bestiary-run-2026-07-01\.md/);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
