import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { auditPins, makeAnchorResolveSegment } from './lib/audit-pins.mjs';
import {
  RITUAL_DAY_MANIFEST_REL,
  SUPPORTED_BLOCK_EXPR,
  evaluateNightReport,
  loadNightReportFrame,
  runNightReportGate,
} from './lib/night-report-gate.mjs';
import { clearNightReportDownloadTargets, parseNightReportArgs, pullNightReport } from './night-report-gate.mjs';

const CARRIER = { path: 'tests/reports/nightly-full/latest.json', blocksMorningWhen: SUPPORTED_BLOCK_EXPR };
const TODAY = '2026-08-11';

function reportFixture(overrides = {}) {
  return {
    schemaVersion: 1,
    generatedAt: `${TODAY}T03:10:00.000Z`,
    setup: { run: ['a.test.mjs', 'b.test.mjs'], notRun: ['c.test.mjs'], skipped: [] },
    kit: { id: 'tests-master', ok: true },
    execution: { status: 'pass', exitCode: 0 },
    problems: [],
    ...overrides,
  };
}

test('evaluateNightReport: три различимых блокера — missing / stale / red', () => {
  const missing = evaluateNightReport({ carrier: CARRIER, report: null, reportProblem: 'носителя нет: x', today: TODAY });
  assert.equal(missing.status, 'missing');
  assert.match(missing.blockers[0], /ночь не отработала/u);

  const stale = evaluateNightReport({
    carrier: CARRIER,
    report: reportFixture({ generatedAt: '2026-08-10T03:10:00.000Z' }),
    today: TODAY,
  });
  assert.equal(stale.status, 'stale');
  assert.match(stale.blockers[0], /отчёт от 2026-08-10/u);
  assert.notEqual(stale.blockers[0], missing.blockers[0]);

  const red = evaluateNightReport({
    carrier: CARRIER,
    report: reportFixture({ execution: { status: 'fail', exitCode: 1 }, problems: ['x'] }),
    today: TODAY,
  });
  assert.equal(red.status, 'red');
  assert.match(red.blockers[0], /ночной красный/u);
  assert.match(red.blockers[0], /без разбора/u);
});

test('evaluateNightReport: зелёная свежая ночь проходит, «что не гонялось» видно', () => {
  const ok = evaluateNightReport({ carrier: CARRIER, report: reportFixture(), today: TODAY });
  assert.equal(ok.status, 'pass');
  assert.equal(ok.blockers.length, 0);
  assert.ok(ok.summary.some((s) => s.includes('не гонялось: 1')));
});

test('evaluateNightReport: неподдержанное выражение кадра — fail closed', () => {
  const v = evaluateNightReport({
    carrier: { ...CARRIER, blocksMorningWhen: 'always-green' },
    report: reportFixture(),
    today: TODAY,
  });
  assert.equal(v.status, 'invalid');
  assert.match(v.blockers[0], /fail closed/u);
});

/** Временный repoRoot с манифестом ritual-day и (опц.) носителем. */
function tempRoot({ report } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tw-night-'));
  const manifestAbs = join(root, RITUAL_DAY_MANIFEST_REL);
  mkdirSync(dirname(manifestAbs), { recursive: true });
  writeFileSync(
    manifestAbs,
    JSON.stringify({ id: 'ritual-day', frames: [{ id: 'night-report', holder: 'angelina', carrier: CARRIER }] }),
    'utf8',
  );
  if (report) {
    const abs = join(root, CARRIER.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(report), 'utf8');
  }
  return root;
}

test('runNightReportGate: подсаженный красный отчёт останавливает утро (exit 2)', () => {
  const lines = [];
  const code = runNightReportGate(
    tempRoot({ report: reportFixture({ execution: { status: 'fail', exitCode: 1 } }) }),
    { log: (s) => lines.push(s), today: TODAY },
  );
  assert.equal(code, 2);
  assert.ok(lines.some((l) => l.includes('ночной красный')));
});

test('runNightReportGate: свежий зелёный — 0; отсутствие носителя — 2 своим текстом', () => {
  assert.equal(
    runNightReportGate(tempRoot({ report: reportFixture() }), { log: () => {}, today: TODAY }),
    0,
  );
  const lines = [];
  assert.equal(runNightReportGate(tempRoot(), { log: (s) => lines.push(s), today: TODAY }), 2);
  assert.ok(lines.some((l) => l.includes('ночь не отработала')));
});

test('пины кадра night-report: целы в дереве, подсаженный дрейф ловится падением', () => {
  const repoRoot = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')), '..');
  const { frame } = loadNightReportFrame(repoRoot);
  const pins = frame?.pins ?? [];
  assert.equal(pins.length, 2);

  const clean = auditPins(pins, makeAnchorResolveSegment(repoRoot), { pinType: 'segment' });
  assert.ok(clean.every((f) => f.status === 'matched'), JSON.stringify(clean, null, 2));

  // Подсадить дрейф: копия дерева с правкой строки ВНУТРИ отрезка reader.
  const tampered = mkdtempSync(join(tmpdir(), 'tw-night-drift-'));
  for (const pin of pins) {
    const abs = join(tampered, pin.path);
    mkdirSync(dirname(abs), { recursive: true });
    let text = readFileSync(join(repoRoot, pin.path), 'utf8');
    if (pin.anchor.ref === 'night-report-reader') {
      text = text.replace('носителя нет', 'носителя нет (подсажено)');
    }
    writeFileSync(abs, text, 'utf8');
  }
  const drift = auditPins(pins, makeAnchorResolveSegment(tampered), { pinType: 'segment' });
  const reader = drift.find((f) => f.anchor?.ref === 'night-report-reader' || f.path.includes('night-report-gate'));
  assert.equal(reader?.status, 'segment-drift');
});

test('parseNightReportArgs + pullNightReport с подставным gh', () => {
  assert.deepEqual(parseNightReportArgs(['--pull', '--today', '2026-08-11']), {
    pull: true,
    today: '2026-08-11',
    help: false,
  });
  assert.throws(() => parseNightReportArgs(['--today', 'вчера']));

  const calls = [];
  const root = tempRoot();
  const okPull = pullNightReport(root, {
    exec: (cmd, args) => {
      calls.push([cmd, args[0], args[1]]);
      if (args[0] === 'run' && args[1] === 'list') {
        return JSON.stringify([{ databaseId: 42, conclusion: 'success', updatedAt: '2026-08-11T03:20:00Z' }]);
      }
      return '';
    },
  });
  assert.equal(okPull, true);
  assert.deepEqual(calls.map((c) => c[1] + ':' + c[2]), ['run:list', 'run:download']);

  const failPull = pullNightReport(root, {
    exec: () => {
      throw new Error('gh недоступен');
    },
  });
  assert.equal(failPull, false);
});

test('pullNightReport: перед gh download удаляет существующие latest.* носители', () => {
  const root = tempRoot();
  const destDir = join(root, dirname(CARRIER.path));
  mkdirSync(destDir, { recursive: true });
  const jsonPath = join(destDir, 'latest.json');
  const mdPath = join(destDir, 'latest.md');
  writeFileSync(jsonPath, '{}', 'utf8');
  writeFileSync(mdPath, '# old', 'utf8');

  const okPull = pullNightReport(root, {
    exec: (_cmd, args) => {
      if (args[0] === 'run' && args[1] === 'list') {
        return JSON.stringify([{ databaseId: 43, conclusion: 'success', updatedAt: '2026-08-16T03:20:00Z' }]);
      }
      assert.equal(args[0], 'run');
      assert.equal(args[1], 'download');
      assert.equal(existsSync(jsonPath), false);
      assert.equal(existsSync(mdPath), false);
      return '';
    },
  });

  assert.equal(okPull, true);
});

test('clearNightReportDownloadTargets: чистит только ожидаемые latest-файлы', () => {
  const root = tempRoot();
  const destDir = join(root, dirname(CARRIER.path));
  mkdirSync(destDir, { recursive: true });
  const keepPath = join(destDir, 'history.json');
  writeFileSync(join(destDir, 'latest.json'), '{}', 'utf8');
  writeFileSync(join(destDir, 'latest.md'), '# old', 'utf8');
  writeFileSync(keepPath, '{}', 'utf8');

  clearNightReportDownloadTargets(destDir, CARRIER.path);

  assert.equal(existsSync(join(destDir, 'latest.json')), false);
  assert.equal(existsSync(join(destDir, 'latest.md')), false);
  assert.equal(existsSync(keepPath), true);
});
