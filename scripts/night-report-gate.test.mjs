import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { auditPins, makeAnchorResolveSegment } from './lib/audit-pins.mjs';
import { NIGHT_SUMMARY_REPORT_REL } from './lib/night-summary.mjs';
import {
  RITUAL_DAY_MANIFEST_REL,
  SUPPORTED_BLOCK_EXPR,
  evaluateNightReport,
  loadNightReportFrame,
  runNightReportGate,
} from './lib/night-report-gate.mjs';
import { NIGHTLY_FULL_REPORT_REL } from './lib/tests-nightly-full.mjs';
import { clearNightReportDownloadTargets, parseNightReportArgs, pullNightReport } from './night-report-gate.mjs';

const CARRIER = { path: NIGHT_SUMMARY_REPORT_REL, blocksMorningWhen: SUPPORTED_BLOCK_EXPR };
const TODAY = '2026-08-11';
/** Время суждения гейта: утро 11.08. Цикл ночи (0 22 * * *) открыт 10.08 в 22:00. */
const NOW = `${TODAY}T05:00:00.000Z`;
const HEAD_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const HEAD_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const HEAD_C = 'cccccccccccccccccccccccccccccccccccccccc';

function reportFixture(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'night-summary',
    generatedAt: `${TODAY}T03:10:00.000Z`,
    git: { revision: HEAD_A },
    workflows: [
      {
        id: 'tests-nightly-full',
        title: 'Tests nightly full',
        workflow: 'tests-nightly-full.yml',
        required: true,
        cron: '0 22 * * *',
        status: 'pass',
        reason: 'success',
        run: {
          databaseId: 42,
          headSha: HEAD_A,
          trunkRevisionAtStart: HEAD_A,
          createdAt: `${TODAY}T00:14:00.000Z`,
          status: 'completed',
          conclusion: 'success',
        },
      },
    ],
    execution: { status: 'pass', exitCode: 0 },
    problems: [],
    ...overrides,
  };
}

/** Порча одного поля прогона — точечная, без переписи фикстуры. */
function reportWithRun(runOverrides, overrides = {}) {
  const report = reportFixture(overrides);
  report.workflows[0].run = { ...report.workflows[0].run, ...runOverrides };
  return report;
}

test('evaluateNightReport: три различимых блокера — missing / stale / red', () => {
  const missing = evaluateNightReport({ carrier: CARRIER, report: null, reportProblem: 'носителя нет: x', today: TODAY });
  assert.equal(missing.status, 'missing');
  assert.match(missing.blockers[0], /ночь не отработала/u);

  const stale = evaluateNightReport({
    carrier: CARRIER,
    report: reportWithRun({ headSha: HEAD_B }),
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
  });
  assert.equal(stale.status, 'stale');
  assert.match(stale.blockers[0], /в тот момент был на/u);
  assert.notEqual(stale.blockers[0], missing.blockers[0]);

  const red = evaluateNightReport({
    carrier: CARRIER,
    report: reportFixture({ execution: { status: 'fail', exitCode: 1 }, problems: ['x'] }),
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
  });
  assert.equal(red.status, 'red');
  assert.match(red.blockers[0], /ночной красный/u);
  assert.match(red.blockers[0], /без разбора/u);
});

test('evaluateNightReport: зелёная сводка ночи проходит и читает workflow-строки', () => {
  const ok = evaluateNightReport({ carrier: CARRIER, report: reportFixture(), today: '2026-08-12', now: NOW, expectedRevision: HEAD_A });
  assert.equal(ok.status, 'pass');
  assert.equal(ok.blockers.length, 0);
  assert.ok(ok.summary.some((s) => s.includes('ночь/Tests nightly full: pass')));
});

test('evaluateNightReport: старый detailed tests-report остаётся читаемым переходным носителем', () => {
  const legacyReport = {
    schemaVersion: 1,
    generatedAt: `${TODAY}T03:10:00.000Z`,
    git: { revision: HEAD_A },
    setup: { run: ['scripts/a.test.mjs'], notRun: [] },
    execution: { status: 'pass', exitCode: 0 },
    problems: [],
  };

  const verdict = evaluateNightReport({ carrier: CARRIER, report: legacyReport, today: TODAY, now: NOW, expectedRevision: HEAD_A });
  assert.equal(verdict.status, 'pass');
  assert.equal(verdict.blockers.length, 0);
  assert.ok(verdict.summary.some((s) => s.includes('гонялось файлов: 1')));
});

test('evaluateNightReport: сводка без обязательного чтения workflow не проходит', () => {
  const report = reportFixture({
    workflows: [
      {
        id: 'vitest-nightly',
        title: 'Vitest nightly',
        workflow: 'vitest-nightly.yml',
        required: true,
        status: 'red',
        reason: 'conclusion=failure',
      },
    ],
    execution: { status: 'pass', exitCode: 0 },
  });
  const verdict = evaluateNightReport({ carrier: CARRIER, report, today: TODAY, now: NOW, expectedRevision: HEAD_A });
  assert.equal(verdict.status, 'red');
  assert.match(verdict.blockers[0], /Vitest nightly/u);
  assert.match(verdict.blockers[0], /conclusion=failure/u);
});

test('evaluateNightReport: pending workflow остаётся pending в агрегатном статусе', () => {
  const report = reportFixture({
    workflows: [
      {
        id: 'vitest-nightly',
        title: 'Vitest nightly',
        workflow: 'vitest-nightly.yml',
        required: true,
        status: 'pending',
        reason: 'запуск ещё не завершён: in_progress',
      },
    ],
    execution: { status: 'pass', exitCode: 0 },
  });

  const verdict = evaluateNightReport({ carrier: CARRIER, report, today: TODAY, now: NOW, expectedRevision: HEAD_A });
  assert.equal(verdict.status, 'pending');
  assert.match(verdict.blockers[0], /Vitest nightly/u);
  assert.match(verdict.blockers[0], /in_progress/u);
});

test('evaluateNightReport: свежесть не завязана на календарь, но устаревшая при старте вершина красная', () => {
  const delayed = evaluateNightReport({
    carrier: CARRIER,
    report: reportFixture({ generatedAt: '2026-08-10T13:55:00.000Z' }),
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
  });
  assert.equal(delayed.status, 'pass');

  const wrongHead = evaluateNightReport({
    carrier: CARRIER,
    report: reportWithRun({ headSha: HEAD_B }),
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
  });
  assert.equal(wrongHead.status, 'stale');
  assert.match(wrongHead.blockers[0], /запуск на bbbbbbbbbbbb/u);
});

// ─── #2501/#2504: гейт судит свежесть сам, по фактам сводки ────────────────────

test('ПОРЧА 1 (гейт): утренний мердж не красит ночь — ствол ушёл вперёд, ночь зелёная', () => {
  // Живой случай 28.09: ночь на b44d05f3, ствол к утру дошёл до b538b10a.
  const nightHead = 'b44d05f37589aa98c5faf1432264423219b3c2d1';
  const trunkNow = 'b538b10af12fb112cb8b6d299fd29439bf25cf11';
  const report = reportFixture({ git: { revision: trunkNow } });
  report.workflows[0].cron = '0 20 * * *';
  report.workflows[0].run = {
    databaseId: 36356982602,
    headSha: nightHead,
    trunkRevisionAtStart: nightHead,
    createdAt: '2026-09-27T22:56:18Z',
    status: 'completed',
    conclusion: 'success',
    schedule: { cron: '0 20 * * *', latenessMs: (2 * 60 + 56) * 60_000 },
  };

  const verdict = evaluateNightReport({
    carrier: CARRIER,
    report,
    today: '2026-09-28',
    now: '2026-09-28T07:30:00.000Z',
    expectedRevision: trunkNow,
  });
  assert.equal(verdict.status, 'pass');
  // Строка опоздания — замер #2502, он остаётся.
  assert.ok(verdict.summary.some((line) => line.includes('пришло +2 ч 56 мин')));
});

test('ПОРЧА 2 (гейт): pass в сводке не прикрывает запуск на уже устаревшей ссылке', () => {
  const report = reportWithRun(
    { headSha: HEAD_B, trunkRevisionAtStart: HEAD_A },
    { git: { revision: HEAD_C } },
  );

  const verdict = evaluateNightReport({
    carrier: CARRIER,
    report,
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_C,
  });
  assert.equal(verdict.status, 'stale');
  assert.match(verdict.blockers[0], /в тот момент был на aaaaaaaaaaaa/u);
});

test('ПОРЧА 3 (гейт): вчерашняя сводка, прочитанная сегодня, не зеленеет своим же pass', () => {
  // Утро читает носитель БЕЗ --pull (morning-care), поэтому вчерашний артефакт
  // внутренне непротиворечив: headSha = вершина своего времени, статус pass.
  // Судит гейт по своим часам: прогон не принадлежит открытому циклу ночи.
  const report = reportWithRun(
    {
      headSha: HEAD_B,
      trunkRevisionAtStart: HEAD_B,
      createdAt: '2026-08-09T00:14:00.000Z',
    },
    { generatedAt: '2026-08-09T03:10:00.000Z', git: { revision: HEAD_B } },
  );

  const verdict = evaluateNightReport({
    carrier: CARRIER,
    report,
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
  });
  assert.equal(verdict.status, 'stale');
  assert.match(verdict.blockers[0], /старше текущего цикла ночи/u);
});

test('сводка старого прибора (без вершины на момент старта) — invalid, а не молчаливый pass', () => {
  const report = reportFixture();
  delete report.workflows[0].run.trunkRevisionAtStart;

  const verdict = evaluateNightReport({
    carrier: CARRIER,
    report,
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
  });
  assert.equal(verdict.status, 'invalid');
  assert.match(verdict.blockers[0], /вершина ствола на момент запуска не установлена/u);
});

test('гейт без времени суждения не зеленеет: цикл ночи не установлен', () => {
  const verdict = evaluateNightReport({
    carrier: CARRIER,
    report: reportFixture(),
    today: TODAY,
    expectedRevision: HEAD_A,
  });
  assert.equal(verdict.status, 'invalid');
  assert.match(verdict.blockers[0], /цикл ночи не установлен/u);
});

test('evaluateNightReport: неподдержанное выражение кадра — fail closed', () => {
  const v = evaluateNightReport({
    carrier: { ...CARRIER, blocksMorningWhen: 'always-green' },
    report: reportFixture(),
    today: TODAY,
    now: NOW,
    expectedRevision: HEAD_A,
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
    { log: (s) => lines.push(s), today: TODAY, now: NOW, expectedRevision: HEAD_A },
  );
  assert.equal(code, 2);
  assert.ok(lines.some((l) => l.includes('ночной красный')));
});

test('runNightReportGate: свежий зелёный — 0; отсутствие носителя — 2 своим текстом', () => {
  assert.equal(
    runNightReportGate(tempRoot({ report: reportFixture() }), { log: () => {}, today: TODAY, now: NOW, expectedRevision: HEAD_A }),
    0,
  );
  const lines = [];
  assert.equal(runNightReportGate(tempRoot(), { log: (s) => lines.push(s), today: TODAY, now: NOW, expectedRevision: HEAD_A }), 2);
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
    expectedRevision: null,
    help: false,
  });
  assert.throws(() => parseNightReportArgs(['--today', 'вчера']));
  assert.throws(() => parseNightReportArgs(['--expected-revision', 'abc1234']));

  const calls = [];
  const root = tempRoot();
  const okPull = pullNightReport(root, {
    expectedRevision: HEAD_A,
    trunkRevisionAt: () => HEAD_A,
    historyHas: () => true,
    exec: (cmd, args) => {
      calls.push([cmd, args[0], args[1]]);
      if (args[0] === 'run' && args[1] === 'list') {
        return JSON.stringify([
          {
            databaseId: 42,
            event: 'schedule',
            status: 'completed',
            conclusion: 'success',
            createdAt: '2026-08-11T03:20:00Z',
            updatedAt: '2026-08-11T03:20:00Z',
            headSha: HEAD_A,
          },
        ]);
      }
      return '';
    },
  });
  assert.equal(okPull, true);
  assert.ok(calls.map((c) => c[1] + ':' + c[2]).includes('run:download'));

  const redSummaryPull = pullNightReport(root, {
    expectedRevision: HEAD_A,
    trunkRevisionAt: () => HEAD_A,
    historyHas: () => true,
    exec: (_cmd, args) => {
      if (args[0] === 'run' && args[1] === 'list') {
        return JSON.stringify([
          {
            databaseId: 44,
            event: 'schedule',
            status: 'completed',
            conclusion: 'failure',
            createdAt: '2026-08-11T03:20:00Z',
            updatedAt: '2026-08-11T03:20:00Z',
            headSha: HEAD_A,
          },
        ]);
      }
      return '';
    },
  });
  assert.equal(redSummaryPull, true);

  const failPull = pullNightReport(root, {
    exec: () => {
      throw new Error('gh недоступен');
    },
  });
  assert.equal(failPull, false);
});

test('pullNightReport: перед gh download удаляет существующие latest.* носители', () => {
  const root = tempRoot();
  const destDir = join(root, dirname(NIGHTLY_FULL_REPORT_REL));
  mkdirSync(destDir, { recursive: true });
  const jsonPath = join(destDir, 'latest.json');
  const mdPath = join(destDir, 'latest.md');
  writeFileSync(jsonPath, '{}', 'utf8');
  writeFileSync(mdPath, '# old', 'utf8');

  const okPull = pullNightReport(root, {
    expectedRevision: HEAD_A,
    trunkRevisionAt: () => HEAD_A,
    historyHas: () => true,
    exec: (_cmd, args) => {
      if (args[0] === 'run' && args[1] === 'list') {
        return JSON.stringify([
          {
            databaseId: 43,
            event: 'schedule',
            status: 'completed',
            conclusion: 'success',
            createdAt: '2026-08-16T03:20:00Z',
            updatedAt: '2026-08-16T03:20:00Z',
            headSha: HEAD_A,
          },
        ]);
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
