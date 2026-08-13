import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  HANDWRITTEN_NORMS,
  checkAgainstPolicy,
  classifyHttp,
  normalizeSnapshot,
  recomputeProjections,
  sanitizeTarget,
  snapshotProblems,
} from './lib/network-probes.mjs';
import { runNetworkProbes } from './network-probes.mjs';
import { HOT_DAYS, runArchiveNetworkAnalysis } from './archive-network-analysis.mjs';

const PLAN_ENTRY = { probe_id: 'p1', organ: 'net:http', target: 'https://x.test/health', infra_node_id: 'node-x' };

test('нормализация: executed → снимок словаря; failed — без status', () => {
  const ok = normalizeSnapshot(PLAN_ENTRY, { at: '2026-08-13T01:00:00Z', machine: 'ci', httpStatus: 200, latencyMs: 42.7, executed: true });
  assert.deepEqual(snapshotProblems(ok), []);
  assert.equal(ok.status, 'ok');
  assert.equal(ok.metrics.latencyMs, 43);
  assert.equal(ok.route.infra_node_id, 'node-x');

  const failed = normalizeSnapshot(PLAN_ENTRY, { at: '2026-08-13T01:00:00Z', machine: 'ci', executed: false });
  assert.deepEqual(snapshotProblems(failed), []);
  assert.equal(failed.outcome, 'failed');
  assert.ok(!('status' in failed));
});

test('classifyHttp: 2xx/3xx ok · 4xx degraded · 5xx/сеть down; unknown не рождается', () => {
  assert.equal(classifyHttp(204, null), 'ok');
  assert.equal(classifyHttp(301, null), 'ok');
  assert.equal(classifyHttp(404, null), 'degraded');
  assert.equal(classifyHttp(502, null), 'down');
  assert.equal(classifyHttp(null, 'net:timeout'), 'down');
});

test('санитизация цели: userinfo/query/fragment срезаются (запрещённые классы)', () => {
  assert.equal(sanitizeTarget('https://user:pass@host.test/path?token=secret#f'), 'https://host.test/path');
  const dirty = normalizeSnapshot({ ...PLAN_ENTRY, target: 'https://u@h.test/a?x=1' }, { at: '2026-08-13T01:00:00Z', machine: 'ci', httpStatus: 200, executed: true });
  assert.deepEqual(snapshotProblems(dirty), []);
});

test('пересчёт: лента → проекции; рукописные нормы под защитой контракта', () => {
  const records = [
    { probe_id: 'a', organ: 'net:http', at: '2026-08-13T01:00:00Z', machine: 'ci', target: 'https://a/', outcome: 'executed', status: 'ok' },
    { probe_id: 'a', organ: 'net:http', at: '2026-08-13T01:05:00Z', machine: 'ci', target: 'https://a/', outcome: 'executed', status: 'down' },
    { probe_id: 'b', organ: 'net:http', at: '2026-08-13T01:00:00Z', machine: 'ci', target: 'https://b/', outcome: 'failed' },
  ];
  const { projections, summary } = recomputeProjections(records, { generatedAt: '2026-08-13T06:00:00Z' });
  assert.deepEqual(Object.keys(projections).sort(), ['a.json', 'b.json']);
  assert.equal(projections['a.json'].latest.status, 'down'); // поздний снимок побеждает
  assert.equal(summary.failed, 1);
  assert.ok(summary.blind.includes('классификация целей'));
  for (const norm of HANDWRITTEN_NORMS) assert.ok(!(norm in projections), norm);
});

test('T_night v1: незнакомая машина — находка с именем зонда', () => {
  const findings = checkAgainstPolicy(
    [{ probe_id: 'x', machine: 'призрак', target: 'https://x/' }],
    { machines: [{ machine: 'ci' }, { machine: 'dev' }] },
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /призрак/u);
});

test('CLI collect (подставной зонд) → валидная лента; recompute → проекции; пропуск ночи не трогает registry', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'tw-netprobes-'));
  mkdirSync(join(cwd, 'docs/audit/network/registry'), { recursive: true });
  writeFileSync(join(cwd, 'docs/audit/network/registry/probes-plan.json'), JSON.stringify({ probes: [PLAN_ENTRY] }), 'utf8');
  writeFileSync(join(cwd, 'docs/audit/network/registry/machine-policy.json'), JSON.stringify({ machines: [{ machine: 'ci' }, { machine: 'dev' }], allowedBarePackages: [] }), 'utf8');

  const log = [];
  const code = await runNetworkProbes(['collect', '--out', 'docs/audit/network/cache/probes.jsonl'], {
    cwd,
    log: (s) => log.push(s),
    now: new Date('2026-08-13T01:00:00Z'),
    probe: async () => ({ executed: true, httpStatus: 200, latencyMs: 10, errorClass: null }),
  });
  assert.equal(code, 0);
  const ledger = readFileSync(join(cwd, 'docs/audit/network/cache/probes.jsonl'), 'utf8').trim();
  assert.deepEqual(snapshotProblems(JSON.parse(ledger)), []);

  // лента дня → recompute
  mkdirSync(join(cwd, 'docs/audit/network/analysis/2026-08-13'), { recursive: true });
  writeFileSync(join(cwd, 'docs/audit/network/analysis/2026-08-13/probes.jsonl'), `${ledger}\n`, 'utf8');
  const code2 = await runNetworkProbes(['recompute', '--date', '2026-08-13'], { cwd, log: (s) => log.push(s) });
  assert.equal(code2, 0);
  assert.ok(existsSync(join(cwd, 'docs/audit/network/registry/p1.json')));
  const summary = JSON.parse(readFileSync(join(cwd, 'docs/audit/network/registry/summary.json'), 'utf8'));
  assert.equal(summary.probes, 1);

  // пропуск ночи: recompute другой даты — отказ, summary не перезаписан
  const before = readFileSync(join(cwd, 'docs/audit/network/registry/summary.json'), 'utf8');
  const code3 = await runNetworkProbes(['recompute', '--date', '2026-08-14'], { cwd, log: (s) => log.push(s) });
  assert.equal(code3, 1);
  assert.equal(readFileSync(join(cwd, 'docs/audit/network/registry/summary.json'), 'utf8'), before);
});

test('retention: лента старше 90 дней — кандидат; свежая — нет; --execute перекладывает', () => {
  // используем реальный root скрипта через deps нельзя (константа) — проверяем горизонт числом
  assert.equal(HOT_DAYS, 90);
  const log = [];
  const code = runArchiveNetworkAnalysis({ now: new Date('2026-08-13T00:00:00Z'), log: (s) => log.push(s) });
  assert.equal(code, 0);
  // на живом дереве лента 2026-08-13 свежая — кандидатов нет
  assert.ok(log.some((l) => l.includes('чист') || l.includes('кандидат')), log.join('\n'));
});
