/**
 * B2/B3: каждый class BESTIARY ловится на своём specimen; аудитор не silent-green.
 * B3: echo (origin-hash / dedupeByOrigin); goal-displacement — явный defer.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ORPHAN_RULESET,
  auditSpecimenCoverage,
  formatBestiaryListMarkdown,
  listSpecimenFiles,
} from './lib/bestiary-audit.mjs';
import { BESTIARY, aimBestiary, detectEchoChamber } from './lib/lens-bestiary.mjs';
import { originHash } from './lib/truth-graph.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const specimensRoot = join(root, 'docs', 'audit', 'bestiary', 'specimens');

describe('bestiary specimen coverage', () => {
  test('у каждого class BESTIARY есть ≥1 .mjs specimen', () => {
    for (const b of BESTIARY) {
      const files = listSpecimenFiles(specimensRoot, b.defectClass);
      assert.ok(files.length >= 1, `${b.defectClass}: нет specimen .mjs`);
    }
  });

  test('orphan-ruleset: каждый class даёт ≥1 finding на своём каталоге', () => {
    const report = auditSpecimenCoverage(root, { ruleset: ORPHAN_RULESET });
    assert.equal(report.ok, true, `uncovered: ${report.uncovered.map((u) => u.defectClass).join(', ')}`);
    for (const r of report.rows) {
      assert.ok(r.hits >= 1, `${r.defectClass}: hits=${r.hits}`);
    }
  });

  test('самопроверка не silent-green: findings > 0 при живых specimens', () => {
    const report = auditSpecimenCoverage(root);
    assert.ok(report.findings.length > 0, '0 findings при живых specimens = молчун охотника');
  });

  test('formatBestiaryListMarkdown содержит Meta и все defectClass', () => {
    const report = auditSpecimenCoverage(root);
    const md = formatBestiaryListMarkdown(report, { date: '2026-07-22', headSha: 'deadbeef' });
    assert.match(md, /Source \| yarn bestiary:audit/);
    for (const b of BESTIARY) assert.match(md, new RegExp(`\`${b.defectClass}\``));
  });

  test('silent specimen: empty catch ловится (маркер specimen не глушит)', () => {
    const files = listSpecimenFiles(specimensRoot, 'silent');
    const text = readFileSync(files[0], 'utf8');
    const { findings } = aimBestiary(
      [{ path: 'specimens/silent/swallow.mjs', text }],
      ORPHAN_RULESET,
    );
    assert.ok(findings.some((f) => f.defectClass === 'silent'));
  });

  test('echo specimen: тройное отражение одного origin ловится', () => {
    const files = listSpecimenFiles(specimensRoot, 'echo');
    assert.ok(files.length >= 1);
    const text = readFileSync(files[0], 'utf8');
    const { findings } = aimBestiary(
      [{ path: 'specimens/echo/triple-reflection.mjs', text }],
      ORPHAN_RULESET,
    );
    const echoHits = findings.filter((f) => f.defectClass === 'echo');
    assert.ok(echoHits.length >= 1, 'echo specimen не пойман');
    assert.match(echoHits[0].evidence, /×3/);
  });

  test('echo: файл с dedupeByOrigin не флажится (провод на месте)', () => {
    const text = `
const sources = [
  { origin: 'same@1' },
  { origin: 'same@1' },
];
import { dedupeByOrigin } from './truth-graph.mjs';
const n = dedupeByOrigin(sources).length;
`;
    assert.deepEqual(detectEchoChamber({ path: 'safe.mjs', text }), []);
  });

  test('echo: originHash из truth-graph совпадает с evidence', () => {
    const origin = 'detection-planning-priorities.mjs@2026-07-06';
    const text = `
const a = { origin: '${origin}' };
const b = { origin: '${origin}' };
`;
    const hits = detectEchoChamber({ path: 'x.mjs', text });
    assert.equal(hits.length, 1);
    assert.ok(hits[0].evidence.includes(originHash(origin)));
  });
});
