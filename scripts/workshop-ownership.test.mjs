import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkOwnership, extractOwnedTools } from './lib/workshop-ownership.mjs';

test('extractOwnedTools: доменные инструменты с их worksOn', () => {
  const manifest = {
    worksOn: 'docs/audit/git',
    verbs: { audit: 'a', decompose: 'd', inspectElement: null, domain: [{ name: 'salvage', worksOn: 'docs/audit/git' }] },
  };
  const recs = extractOwnedTools(manifest, 'git');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].name, 'salvage');
  assert.equal(recs[0].declaredWorksOn, 'docs/audit/git');
  assert.equal(recs[0].manifestWorksOn, 'docs/audit/git');
});

test('extractOwnedTools: пустой domain → нет записей (обяз. глаголы не проверяются)', () => {
  const manifest = { worksOn: 'x', verbs: { audit: 'a', decompose: 'd', inspectElement: null, domain: [] } };
  assert.equal(extractOwnedTools(manifest, 'x').length, 0);
});

test('checkOwnership: правильно приписанный инструмент — ok, без нарушений', () => {
  const recs = [{ name: 't', declaredWorksOn: 'H', manifestWorksOn: 'H', home: 'h' }];
  const r = checkOwnership(recs);
  assert.equal(r.violations.length, 0);
  assert.equal(r.ok.length, 1);
});

test('checkOwnership: мис-филен (declaredWorksOn ≠ manifestWorksOn) — нарушение', () => {
  const recs = [{ name: 'обзор', declaredWorksOn: 'docs/procedures', manifestWorksOn: 'docs/audit/tasks', home: 'tasks' }];
  const r = checkOwnership(recs);
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].kind, 'misfiled');
});

test('checkOwnership: мис-филен, но в allowlist — амнистия, не нарушение', () => {
  const recs = [{ name: 'обзор-спринта', declaredWorksOn: 'docs/procedures', manifestWorksOn: 'docs/audit/tasks', home: 'tasks' }];
  const allow = [{ tool: 'обзор-спринта', reason: '#915', expiresWhen: 'мастерская создана' }];
  const r = checkOwnership(recs, allow);
  assert.equal(r.violations.length, 0);
  assert.equal(r.amnestied.length, 1);
  assert.equal(r.amnestied[0].allow.reason, '#915');
});

test('checkOwnership: дубль инструмента в двух манифестах — нарушение уникальности', () => {
  const recs = [
    { name: 'dup', declaredWorksOn: 'H', manifestWorksOn: 'H', home: 'a' },
    { name: 'dup', declaredWorksOn: 'H', manifestWorksOn: 'H', home: 'b' },
  ];
  const r = checkOwnership(recs);
  assert.ok(r.violations.some((v) => v.kind === 'duplicate'));
});
