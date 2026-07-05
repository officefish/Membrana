import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RULES, scanRule } from './check-package-boundaries.mjs';

const outRule = RULES.find((r) => r.id === 'comms-studio-no-product-imports');
const inRule = RULES.find((r) => r.id === 'comms-studio-no-inbound-imports');

test('CC2 — comms boundary rules registered', () => {
  assert.ok(outRule, 'outdegree rule present');
  assert.ok(inRule, 'indegree rule present');
});

test('CC2 positive — real comms-studio imports no @membrana/* (outdegree = 0)', () => {
  assert.deepEqual(scanRule(outRule), []);
});

test('CC2 positive — no product package imports comms-studio (indegree = 0)', () => {
  assert.deepEqual(scanRule(inRule), []);
});

test('CC2 negative — artificial @membrana import in comms breaks the check', () => {
  const base = mkdtempSync(join(tmpdir(), 'comms-boundary-out-'));
  try {
    const dir = join(base, 'apps', 'comms-studio', 'src');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'bad.ts'), "import { core } from '@membrana/core';\n", 'utf8');
    const violations = scanRule(outRule, base);
    assert.equal(violations.length, 1, 'исходящее ребро к @membrana/* должно ронять проверку');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('CC2 negative — artificial inbound import of comms-studio breaks the check', () => {
  const base = mkdtempSync(join(tmpdir(), 'comms-boundary-in-'));
  try {
    const dir = join(base, 'apps', 'some-product', 'src');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'bad.ts'), "import { x } from '@membrana/comms-studio';\n", 'utf8');
    const violations = scanRule(inRule, base);
    assert.equal(violations.length, 1, 'входящее ребро к контуру должно ронять проверку');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
