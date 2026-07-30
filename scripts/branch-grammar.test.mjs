import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HOLDER_CONFLICT,
  HOLDER_MISSING,
  nightFreezeVerdict,
  parseBranchName,
  proceduralTransportProblems,
  refCollisionProblems,
  renderShipHeader,
  resolveHolder,
} from './lib/branch-grammar.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RULES = JSON.parse(readFileSync(resolve(repoRoot, 'docs/procedures/layer-rules.json'), 'utf8'));

test('parseBranchName: kind/slug и персона/kind/slug разбираются; живой прецедент #771', () => {
  const two = parseBranchName('feat/pl-r4-grammar', RULES);
  assert.deepEqual({ p: two.persona, k: two.kind, s: two.slug, n: two.problems.length },
    { p: null, k: 'feat', s: 'pl-r4-grammar', n: 0 });
  const three = parseBranchName('angelina/storm/branch-taxonomy-2026-07-21', RULES);
  assert.deepEqual({ p: three.persona, k: three.kind, n: three.problems.length },
    { p: 'angelina', k: 'storm', n: 0 });
});

test('parseBranchName: feature — MISSING с подсказкой про feat; чужая персона — вне словаря', () => {
  assert.match(parseBranchName('feature/x', RULES).problems[0], /используйте feat/u);
  assert.match(parseBranchName('cursor/feat/x', RULES).problems[0], /вне словаря персон/u);
});

test('resolveHolder: 4 ветви тотальной функции (вердикт M4)', () => {
  assert.equal(resolveHolder('dynin', 'dynin').holder, 'dynin');
  assert.equal(resolveHolder('dynin', 'ozhegov').holder, HOLDER_CONFLICT);
  assert.equal(resolveHolder('dynin', null).holder, 'dynin');
  assert.equal(resolveHolder(null, 'ozhegov').holder, 'ozhegov');
  const missing = resolveHolder(null, null);
  assert.equal(missing.holder, HOLDER_MISSING);
  assert.match(missing.reason, /возврат на доработку/u);
});

test('resolveHolder: конфликт несёт оба значения текстом (не тихая победа)', () => {
  const r = resolveHolder('dynin', 'ozhegov');
  assert.match(r.reason, /«dynin».*«ozhegov»/u);
});

test('refCollisionProblems: голый ref блокирует неймспейс; §7а-подсказка только персонам', () => {
  const persona = refCollisionProblems('ozhegov/feat/x', ['main', 'ozhegov'], RULES);
  assert.equal(persona.length, 1);
  assert.match(persona[0], /§7а/u);
  assert.deepEqual(refCollisionProblems('ozhegov/feat/x', ['main'], RULES), []);
  const generic = refCollisionProblems('feat/x', ['feat'], RULES);
  assert.equal(generic.length, 1, 'коллизия git-ref реальна для любого сегмента');
  assert.ok(!generic[0].includes('§7а'), 'без персонной подсказки');
});

test('nightFreezeVerdict: night заморожена без флага, разморожена с флагом; не-night не судится', () => {
  const night = parseBranchName('night/linear-dreams', RULES);
  assert.equal(nightFreezeVerdict(night, false).frozen, true);
  assert.equal(nightFreezeVerdict(night, true).frozen, false);
  assert.equal(nightFreezeVerdict(parseBranchName('feat/x-y', RULES), false).frozen, false);
});

test('renderShipHeader: три оси текстом, красный исход с причиной', () => {
  const parsed = parseBranchName('feat/pl-r4-grammar', RULES);
  const ok = renderShipHeader(parsed, { holder: 'rodchenko', source: 'явное' }, { frozen: false, reason: null });
  assert.match(ok, /тип: feat/u);
  assert.match(ok, /✓ rodchenko/u);
  const bad = renderShipHeader(parsed, resolveHolder(null, null), { frozen: false, reason: null });
  assert.match(bad, /✗ MISSING/u);
});

test('proceduralTransportProblems: storm/meeting ветка не несёт транспортный код молча', () => {
  const parsed = parseBranchName('storm/branch-taxonomy-2026-07-21', RULES);
  const r = proceduralTransportProblems(parsed, [
    'docs/storm/branch-taxonomy-2026-07-21/REPORT.md',
    'scripts/pr-ship.mjs',
  ], RULES);
  assert.equal(r.guarded, true);
  assert.deepEqual(r.allowed, ['docs/storm/branch-taxonomy-2026-07-21/REPORT.md']);
  assert.deepEqual(r.transport, ['scripts/pr-ship.mjs']);
  assert.match(r.problems[0], /процедурная ветка kind=storm/u);
  assert.match(r.problems[0], /--allow-transport/u);
});

test('proceduralTransportProblems: обычная feat ветка и явное разрешение не блокируют', () => {
  const feat = proceduralTransportProblems(parseBranchName('feat/tariff-grid', RULES), ['scripts/x.mjs'], RULES);
  assert.equal(feat.guarded, false);
  assert.deepEqual(feat.problems, []);

  const meeting = parseBranchName('meeting/procedural-layer', RULES);
  const allowed = proceduralTransportProblems(meeting, ['scripts/x.mjs'], RULES, { allowTransport: true });
  assert.equal(allowed.guarded, true);
  assert.deepEqual(allowed.transport, ['scripts/x.mjs']);
  assert.deepEqual(allowed.problems, []);
});
