import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { derivedStatus, registryProblems, renderRegistryMd } from './lib/procedures-registry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = JSON.parse(readFileSync(resolve(repoRoot, 'docs/procedures/registry.json'), 'utf8'));

const OK = {
  id: 'demo', holder: 'dynin', homePath: 'docs/procedures/demo',
  container: { value: true, provenance: 'dynin@abc123' },
  vocabulary: { value: false, provenance: null },
  grammar: { value: true, provenance: 'dynin@abc123' },
};

test('derivedStatus: migrated / in-migration / legacy — производный, три исхода', () => {
  assert.equal(derivedStatus({ container: { value: true }, vocabulary: { value: true }, grammar: { value: true } }), 'migrated');
  assert.equal(derivedStatus(OK), 'in-migration');
  assert.equal(derivedStatus({ container: { value: false }, vocabulary: { value: false }, grammar: { value: false } }), 'legacy');
});

test('хранимое поле migrated — дефект (вердикт M5)', () => {
  const p = registryProblems({ procedures: [{ ...OK, migrated: true }] }, { dirExists: () => true });
  assert.ok(p.some((x) => x.includes('migrated ХРАНИТСЯ')));
});

test('true без провенанса и false с провенансом — дефекты', () => {
  const noProv = { ...OK, container: { value: true, provenance: null } };
  const falseProv = { ...OK, vocabulary: { value: false, provenance: 'x@y' } };
  assert.ok(registryProblems({ procedures: [noProv] }, { dirExists: () => true }).some((x) => x.includes('без провенанса')));
  assert.ok(registryProblems({ procedures: [falseProv] }, { dirExists: () => true }).some((x) => x.includes('противоречие')));
});

test('container ⟺ homePath; несуществующий каталог — дефект', () => {
  const noHome = { ...OK, homePath: null };
  assert.ok(registryProblems({ procedures: [noHome] }, {}).some((x) => x.includes('без homePath')));
  assert.ok(registryProblems({ procedures: [OK] }, { dirExists: () => false }).some((x) => x.includes('не существует')));
});

test('пересечение ключей с реестром задач — дефект (реестры разные)', () => {
  const p = registryProblems({ procedures: [OK] }, { taskIds: ['demo'], dirExists: () => true });
  assert.ok(p.some((x) => x.includes('пересекается с реестром задач')));
});

test('ЗУБ CI: боевой реестр валиден; доноры Р5 мигрированы; проекция синхронна', () => {
  const taskIds = (JSON.parse(readFileSync(resolve(repoRoot, 'docs/tasks/registry.json'), 'utf8')).tasks ?? []).map((t) => t.id);
  const problems = registryProblems(LIVE, { taskIds, dirExists: (p) => existsSync(join(repoRoot, p)) });
  assert.deepEqual(problems, []);
  const byId = Object.fromEntries(LIVE.procedures.map((p) => [p.id, p]));
  assert.equal(derivedStatus(byId['ritual-evening']), 'migrated', 'донор 1 (Р1+Р5)');
  assert.equal(derivedStatus(byId['meeting']), 'migrated', 'донор 2 (Р5)');
  assert.equal(derivedStatus(byId['storm']), 'legacy');
  const projection = readFileSync(resolve(repoRoot, 'docs/procedures/REGISTRY.md'), 'utf8');
  assert.equal(projection, renderRegistryMd(LIVE), 'проекция не разъехалась');
});
