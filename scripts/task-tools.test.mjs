import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  inventoryWorkshopTools,
  renderToolsTable,
  readToolDoc,
  filterTools,
  validateWorkshopCatalog,
} from './lib/task-tools.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('task-tools inventory', () => {
  it('inventoryWorkshopTools: ok, workshop+contract rows, kit present', () => {
    const inv = inventoryWorkshopTools(repoRoot);
    assert.equal(inv.ok, true, inv.problems.join('; '));
    assert.equal(inv.kit, 'kits/tasks-master');
    const zones = new Set(inv.tools.map((t) => t.zone));
    assert.ok(zones.has('workshop'));
    assert.ok(zones.has('contract'));
    assert.ok(zones.has('neighbor'));
    assert.match(inv.table, /inspect/);
    assert.match(inv.table, /task:inspect/);
  });

  it('--zone workshop filters', () => {
    const inv = inventoryWorkshopTools(repoRoot, { zone: 'workshop' });
    assert.equal(inv.ok, true);
    assert.ok(inv.tools.every((t) => t.zone === 'workshop'));
    assert.ok(inv.tools.some((t) => t.id === 'inspect'));
  });

  it('renderToolsTable has header', () => {
    const md = renderToolsTable([{ id: 'x', zone: 'workshop', yarn: 'yarn x', doc: 'a.md', summary: 's' }]);
    assert.match(md, /\| zone \| tool \|/);
    assert.match(md, /`x`/);
  });

  it('readToolDoc inspect returns excerpt', () => {
    const res = readToolDoc(repoRoot, 'inspect');
    assert.equal(res.ok, true, res.error);
    assert.equal(res.path, 'docs/tasks/INSPECT_ELEMENT.md');
    assert.match(res.excerpt, /inspectElement/i);
  });

  it('filterTools by zone', () => {
    const tools = [
      { id: 'a', zone: 'workshop' },
      { id: 'b', zone: 'neighbor' },
    ];
    assert.deepEqual(
      filterTools(tools, { zone: 'neighbor' }).map((t) => t.id),
      ['b'],
    );
  });
});

describe('род declined (слово владельца 11.08, tw-declared-verbs-honest-no)', () => {
  const base = { id: 'x', verb: 'x', zone: 'workshop', doc: 'docs/tasks/WORKSHOP.md', summary: 'снят' };
  const check = (tool) => validateWorkshopCatalog({ tools: [tool] }, { verbs: {} }, repoRoot);

  it('снятый глагол законен без движка — отказ не дефект описи', () => {
    const r = check({ ...base, state: 'declined', yarn: null, script: null, declinedRef: 'docs/tasks/declined-verbs.json' });
    assert.deepEqual(r.problems, []);
  });

  it('отказ обязан быть адресуем: declined без declinedRef — дефект', () => {
    const r = check({ ...base, state: 'declined', yarn: null, script: null });
    assert.ok(r.problems.some((x) => x.includes('declinedRef')), r.problems.join('; '));
  });

  it('снятый глагол не зовут: declined с yarn — дефект', () => {
    const r = check({ ...base, state: 'declined', yarn: 'yarn task:board', declinedRef: 'docs/tasks/declined-verbs.json' });
    assert.ok(r.problems.some((x) => x.includes('движок объявлен')), r.problems.join('; '));
  });

  it('обычная запись без yarn по-прежнему дефект — послабление только для declined', () => {
    const r = check({ ...base });
    assert.ok(r.problems.some((x) => x.includes('нет yarn')), r.problems.join('; '));
  });
});
