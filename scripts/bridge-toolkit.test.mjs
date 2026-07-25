/**
 * Тесты ядра инструментария мостика (кит angelina-bridge).
 *
 * Предмет: схема каталога, инвентарь с честной пометкой отсутствующей оснастки
 * (немой отказ запрещён), фильтр зоны, детерминированность рендера. Плюс зуб на
 * ЖИВОСТЬ реального каталога `docs/bridge/toolkit.catalog.json` — чтобы скилл
 * не грузил инструменты, которых нет в дереве.
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ZONES, catalogSchemaProblems, findTool, inventoryToolkit, renderToolkit } from './lib/bridge-toolkit.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = resolve(ROOT, 'docs/bridge/toolkit.catalog.json');

const catalogOf = (tools) => ({ version: 1, home: 'docs/bridge', kit: 'kits/angelina-bridge', leadPersona: 'angelina', tools });
const tool = (over = {}) => ({ id: 't1', zone: 'room', yarn: 'yarn bridge open', summary: 'делает дело', ...over });
const allExist = () => true;

test('схема: дубль id, чужая зона, инструмент без адреса — дефекты', () => {
  assert.deepEqual(catalogSchemaProblems(catalogOf([tool()])), []);
  assert.ok(catalogSchemaProblems(catalogOf([tool(), tool()])).some((p) => p.includes('дубль id')));
  assert.ok(catalogSchemaProblems(catalogOf([tool({ zone: 'кухня' })])).some((p) => p.includes('вне')));
  assert.ok(
    catalogSchemaProblems(catalogOf([{ id: 't1', zone: 'room', summary: 'без адреса' }])).some((p) => p.includes('без адреса')),
  );
  assert.ok(catalogSchemaProblems({ tools: [] }).length > 0);
  assert.ok(catalogSchemaProblems(null).length > 0);
});

test('инвентарь: отсутствующий файл — видимое предупреждение, не тихий пропуск', () => {
  const catalog = catalogOf([tool({ id: 'lead-journal', zone: 'lead', path: 'docs/virtual-team/angelina/JOURNAL.md' })]);
  const inv = inventoryToolkit(catalog, { exists: () => false });
  assert.equal(inv.problems.length, 0, 'мёртвая ссылка не роняет инвентарь');
  assert.equal(inv.tools.length, 1, 'инструмент остаётся в выдаче');
  assert.equal(inv.tools[0].alive, false);
  assert.equal(inv.warnings.length, 1);
  assert.ok(inv.warnings[0].includes('JOURNAL.md'));
  assert.ok(renderToolkit(inv.tools).includes('⚠'), 'мёртвый инструмент помечен в таблице');
});

test('инвентарь: порядок зон канонический, фильтр --zone режет остальное', () => {
  const catalog = catalogOf([
    tool({ id: 'n1', zone: 'neighbor', path: 'kits/angelina-morning/README.md' }),
    tool({ id: 'r1', zone: 'room' }),
    tool({ id: 'd1', zone: 'debts', yarn: 'yarn bridge debt propose' }),
    tool({ id: 'l1', zone: 'lead', path: 'docs/virtual-team/angelina/JOURNAL.md' }),
  ]);
  const all = inventoryToolkit(catalog, { exists: allExist });
  assert.deepEqual(all.tools.map((t) => t.zone), ZONES, 'комната → попугай → ведущая → соседи');

  const debts = inventoryToolkit(catalog, { exists: allExist, zone: 'debts' });
  assert.deepEqual(debts.tools.map((t) => t.id), ['d1']);

  const bogus = inventoryToolkit(catalog, { exists: allExist, zone: 'кухня' });
  assert.equal(bogus.tools.length, 0);
  assert.ok(bogus.problems[0].includes('кухня'));
});

test('рендер детерминирован и findTool честен об отсутствии', () => {
  const catalog = catalogOf([tool(), tool({ id: 't2', zone: 'debts', yarn: 'yarn bridge debt validate' })]);
  const inv = inventoryToolkit(catalog, { exists: allExist });
  assert.equal(renderToolkit(inv.tools), renderToolkit(inventoryToolkit(catalog, { exists: allExist }).tools));
  assert.equal(renderToolkit([]), '[мостик] инструментов в каталоге нет.');

  assert.equal(findTool(catalog, 't2').ok, true);
  const missing = findTool(catalog, 'нет-такого');
  assert.equal(missing.ok, false);
  assert.ok(missing.error.includes('t1'), 'подсказывает известные id');
});

test('живой каталог мостика: схема цела и вся оснастка на месте', () => {
  assert.ok(existsSync(CATALOG), 'docs/bridge/toolkit.catalog.json существует');
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  assert.deepEqual(catalogSchemaProblems(catalog), []);
  assert.equal(catalog.kit, 'kits/angelina-bridge');
  assert.equal(catalog.leadPersona, 'angelina');

  const inv = inventoryToolkit(catalog, { exists: (rel) => existsSync(resolve(ROOT, rel)) });
  assert.deepEqual(inv.warnings, [], 'каталог не обещает того, чего нет в дереве');
  for (const zone of ZONES) {
    assert.ok(inv.tools.some((t) => t.zone === zone), `зона ${zone} не пуста`);
  }
});
