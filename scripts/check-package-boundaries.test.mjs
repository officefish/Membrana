import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RULES, scanRule } from './check-package-boundaries.mjs';

const outRule = RULES.find((r) => r.id === 'comms-studio-no-product-imports');
const inRule = RULES.find((r) => r.id === 'comms-studio-no-inbound-imports');
const panelRule = RULES.find((r) => r.id === 'panel-no-block-source-imports');

test('CC2 — comms boundary rules registered', () => {
  assert.ok(outRule, 'outdegree rule present');
  assert.ok(inRule, 'indegree rule present');
});

/**
 * ВСЕ правила против живого дерева — циклом, не парой вручную.
 *
 * До 17.07 здесь стояли два теста на comms-правила, и только они были настоящим
 * гейтом: остальные четыре (cabinet, services, device-board ×2) гонялись лишь через
 * `yarn check:boundaries`, а тот вызывается ровно в одном месте — workflow
 * `comms-studio.yml`, который триггерится ТОЛЬКО правкой `apps/comms-studio/**`,
 * `docs/comms/**` и самого скрипта. То есть правило про device-board не запускалось
 * при правке device-board — гейт стоял там, где не может выстрелить.
 *
 * Цикл по RULES чинит это без правки workflow: `test:scripts` уже гоняется в `ci.yml`
 * на всех продуктовых путях (`paths-ignore` отсекает только comms).
 */
for (const rule of RULES) {
  test(`граница «${rule.id}» держится в живом дереве`, () => {
    assert.deepEqual(scanRule(rule), [], `нарушения границы ${rule.id}`);
  });
}

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

// ADR-0010 Р4 — возврат поломки: правило без негативного теста декоративно
// (норма эпика ritual-trust-contour; PG3 #533 — гейт врал при 12 зелёных тестах).

test('GRP1 negative — прямой импорт блока research-tree в панели роняет проверку', () => {
  const base = mkdtempSync(join(tmpdir(), 'panel-boundary-rt-'));
  try {
    const dir = join(base, 'apps', 'panel', 'src', 'components');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'bad.tsx'), "import { Tree } from '@membrana/research-tree-demo';\n", 'utf8');
    const violations = scanRule(panelRule, base);
    assert.equal(violations.length, 1, 'панель, тянущая исходники блока, обязана ронять проверку');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('GRP1 negative — импорт из apps/demos в панели роняет проверку', () => {
  const base = mkdtempSync(join(tmpdir(), 'panel-boundary-demos-'));
  try {
    const dir = join(base, 'apps', 'panel', 'src');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'bad.ts'), "import x from '../../apps/demos/Research-Tree/src/board';\n", 'utf8');
    const violations = scanRule(panelRule, base);
    assert.equal(violations.length, 1, 'относительный путь в блок обязан ронять проверку');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('GRP1 positive — iframe-рамка без импортов границу не нарушает', () => {
  const base = mkdtempSync(join(tmpdir(), 'panel-boundary-ok-'));
  try {
    const dir = join(base, 'apps', 'panel', 'src', 'components');
    mkdirSync(dir, { recursive: true });
    // Живая форма GraphifyBoard: рамка + iframe на мост, исходников блока нет.
    writeFileSync(join(dir, 'ok.tsx'), 'export const B = () => <iframe src="/panel/section/graphify/" />;\n', 'utf8');
    assert.deepEqual(scanRule(panelRule, base), [], 'iframe на мост — не импорт');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
