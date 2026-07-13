import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  buildDriftSectionFromDisk,
  findLatestDriftReport,
  renderDriftSection,
} from './lib/drift-digest-section.mjs';

const FIXTURE = {
  generatedAt: '2026-07-13T00:15:00.000Z',
  anchors: [
    { id: 'registry:hash', kind: 'structural', baseline: 'a', current: 'a', delta: 0, verdict: 'ok' },
    {
      id: 'combinedScore:drone-golden',
      kind: 'behavioral',
      baseline: 0.9136,
      current: 0.71,
      delta: 0.2036,
      verdict: 'broken',
      reasoning: 'вероятно, правка весов fusion-ядра',
    },
  ],
  summary: { ok: 1, drift: 0, broken: 1 },
};

test('renderDriftSection: не-ok якоря списком, reasoning с бейджем «гипотеза»', () => {
  const md = renderDriftSection(FIXTURE, 'DRIFT_2026-07-13.json');
  assert.ok(md.includes('ok 1 · drift 0 · broken 1'));
  assert.ok(md.includes('⛔ broken `combinedScore:drone-golden`'));
  assert.ok(md.includes('гипотеза: вероятно, правка весов fusion-ядра'));
  assert.ok(!md.includes('registry:hash'), 'ok-якоря не перечисляются');
});

test('renderDriftSection: все ok → одна строка сводки', () => {
  const md = renderDriftSection(
    { generatedAt: 'x', anchors: [], summary: { ok: 5, drift: 0, broken: 0 } },
    'DRIFT_2026-07-12.json',
  );
  assert.ok(md.includes('Все якоря в норме'));
});

test('renderDriftSection: битый дайджест → null (graceful)', () => {
  assert.equal(renderDriftSection({}, 'x'), null);
  assert.equal(renderDriftSection(null, 'x'), null);
});

test('findLatestDriftReport: берёт последний по дате, мусор игнорирует', () => {
  const dir = mkdtempSync(join(tmpdir(), 'drift-digest-'));
  writeFileSync(join(dir, 'DRIFT_2026-07-11.json'), '{}');
  writeFileSync(join(dir, 'DRIFT_2026-07-12.json'), '{}');
  writeFileSync(join(dir, 'notes.txt'), '');
  assert.ok(findLatestDriftReport(dir).endsWith('DRIFT_2026-07-12.json'));
  assert.equal(findLatestDriftReport(join(dir, 'missing')), null);
});

test('buildDriftSectionFromDisk: нет каталога → null; битый JSON → null; фикстура → секция', () => {
  const root = mkdtempSync(join(tmpdir(), 'drift-root-'));
  assert.equal(buildDriftSectionFromDisk(root), null);

  const reportsDir = join(root, 'docs/reports/drift-anchor');
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, 'DRIFT_2026-07-12.json'), '{broken json');
  assert.equal(buildDriftSectionFromDisk(root), null);

  writeFileSync(join(reportsDir, 'DRIFT_2026-07-13.json'), JSON.stringify(FIXTURE));
  const md = buildDriftSectionFromDisk(root);
  assert.ok(md.includes('DRIFT_2026-07-13.json'));
});
