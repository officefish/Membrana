import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyFile,
  policyProblems,
  runBareFetchCheck,
} from './lib/check-bare-fetch.mjs';
import { runCheckBareFetch, serverZoneFiles } from './check-bare-fetch.mjs';

const TODAY = '2026-08-13';
const POLICY = {
  machines: [{ machine: 'dev', allowedExits: ['proxy-local'], proxy: 'env' }],
  allowedBarePackages: [
    { type: 'permanent', package: 'packages/background-media/src/linear-snapshot', reason: 'NL direct legal' },
    { type: 'amnesty', package: 'packages/background-x/src/tmp', reason: 'переезд', expiresAt: '2026-08-20' },
    { type: 'amnesty', package: 'packages/background-y/src/old', reason: 'истёкшая', expiresAt: '2026-08-01' },
  ],
};
const BUDGET = { maxBareCallsCount: 3, knownLegacy: [{ site: 'a', note: 'x' }] };

const bare = (p) => ({ path: p, content: 'const r = await fetch(url);' });
const aware = (p) => ({ path: p, content: "import { ProxyAgent } from 'undici'; fetch(u, {dispatcher});" });

test('детект: голый fetch → bare; proxy-обвязка → aware; без fetch → clean', () => {
  assert.equal(classifyFile('packages/background-a/src/x.ts', 'const a = 1;', POLICY, { today: TODAY }).kind, 'clean');
  assert.equal(classifyFile('packages/background-a/src/x.ts', aware('x').content, POLICY, { today: TODAY }).kind, 'aware');
  assert.equal(classifyFile('packages/background-a/src/x.ts', bare('x').content, POLICY, { today: TODAY }).kind, 'bare');
});

test('исключения: permanent покрывает; amnesty живая/истёкшая различимы', () => {
  const ctx = { today: TODAY };
  assert.equal(classifyFile('packages/background-media/src/linear-snapshot/s.ts', bare('x').content, POLICY, ctx).kind, 'allowed');
  assert.equal(classifyFile('packages/background-x/src/tmp/t.ts', bare('x').content, POLICY, ctx).kind, 'amnesty');
  assert.equal(classifyFile('packages/background-y/src/old/o.ts', bare('x').content, POLICY, ctx).kind, 'amnesty-expired');
});

test('храповик: 3 голых в бюджете 3 — LEGACY зелёно; четвёртый → VIOLATION красный с именем файла', () => {
  const three = [bare('packages/background-a/src/1.ts'), bare('packages/background-a/src/2.ts'), bare('packages/background-a/src/3.ts')];
  const green = runBareFetchCheck(three, POLICY, BUDGET, { today: TODAY });
  assert.equal(green.ok, true);
  assert.equal(green.counts.legacy, 3);
  assert.equal(green.counts.violation, 0);

  const four = [...three, bare('packages/background-z/src/новый.ts')];
  const red = runBareFetchCheck(four, POLICY, BUDGET, { today: TODAY });
  assert.equal(red.ok, false);
  const v = red.findings.find((f) => f.kind === 'VIOLATION');
  assert.ok(v.path.includes('новый.ts'));
  assert.match(v.detail, /СВЕРХ бюджета 3/u);
});

test('истёкшая амнистия считается голой и ест бюджет', () => {
  const files = [bare('packages/background-y/src/old/o.ts')];
  const r = runBareFetchCheck(files, POLICY, { maxBareCallsCount: 0, knownLegacy: [] }, { today: TODAY });
  assert.equal(r.ok, false);
  assert.match(r.findings[0].detail, /амнистия истекла/u);
});

test('битая политика → POLICY_INVALID, красный, named problems', () => {
  const r = runBareFetchCheck([], { machines: [], allowedBarePackages: [{ type: 'permanent', package: 'x', reason: '' }] }, BUDGET, { today: TODAY });
  assert.equal(r.ok, false);
  assert.ok(r.findings.every((f) => f.kind === 'POLICY_INVALID'));
  assert.ok(r.findings.some((f) => f.detail.includes('reason обязателен')));
  assert.ok(policyProblems({}).length > 0);
});

test('живой ствол: зона находится, зуб зелёный (3 LEGACY в бюджете, 0 VIOLATION)', () => {
  const files = serverZoneFiles(process.cwd());
  assert.ok(files.length > 300, `зона: ${files.length}`);
  assert.ok(files.every((p) => !p.includes('node_modules') && !p.endsWith('.d.ts')));
  const lines = [];
  const code = runCheckBareFetch([], { cwd: process.cwd(), log: (s) => lines.push(s), today: TODAY });
  assert.equal(code, 0, lines.join('\n'));
  assert.ok(lines.some((l) => l.includes('LEGACY: 3/3')));
});
