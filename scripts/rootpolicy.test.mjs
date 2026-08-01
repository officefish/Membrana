/**
 * Зубы `RootPolicy` — поправка к §3 контракта `workshop-wires`, ратифицирована 31.07.
 *
 * Прогон: `node --test scripts/rootpolicy.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ROOT_CONTAINER_ALLOWLIST,
  listWorkshopManifests,
  validateWorkshop,
} from './lib/validate-workshop.mjs';
import { discoverContainers } from './lib/tooling-atlas.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => p.slice(repoRoot.length + 1).replaceAll('\\', '/');

/** Дерево-макет с манифестами в произвольных местах. */
function fixture(paths) {
  const root = mkdtempSync(join(tmpdir(), 'rootpolicy-'));
  for (const p of paths) {
    mkdirSync(join(root, p), { recursive: true });
    writeFileSync(
      join(root, p, 'workshop.manifest.json'),
      JSON.stringify({ pattern: 'docs/patterns/HOME_WORKSHOP.md', name: p, worksOn: p, kit: null, verbs: {} }),
      'utf8',
    );
  }
  return root;
}

test('корневой контейнер из allowlist виден обоим потребителям', () => {
  const manifests = listWorkshopManifests(repoRoot).map(rel);
  assert.ok(manifests.includes('scripts/workshop.manifest.json'), 'то, чего не видел никто до поправки');
  assert.ok(manifests.some((p) => p.startsWith('docs/')), 'класс docs не потерян');
  // Справочник питается тем же обходом — второй потребитель, ради которого правка и делалась.
  const containers = discoverContainers(repoRoot);
  assert.ok(containers.some((c) => c.home === 'scripts'), 'справочник обязан увидеть тот же дом');
});

test('манифест мастерской скриптов валиден без единого предупреждения', () => {
  const res = validateWorkshop(join(repoRoot, 'scripts', 'workshop.manifest.json'), repoRoot);
  assert.equal(res.valid, true, res.problems.join('; '));
  assert.deepEqual(res.warnings, [], 'каноническая тройка инвентаря закрыта целиком');
});

test('второй класс поимённый: корневая папка вне allowlist домом не становится', () => {
  const root = fixture(['docs/alpha', 'scripts/beta', 'packages/gamma', 'самовольный-дом']);
  const found = listWorkshopManifests(root).map((p) => p.slice(root.length + 1).replaceAll('\\', '/'));
  assert.deepEqual(found, ['docs/alpha/workshop.manifest.json', 'scripts/beta/workshop.manifest.json']);
  // Именно это §3 и запрещает: «любая папка с README (или манифестом) домом не становится».
  assert.ok(!found.some((p) => p.startsWith('packages/')));
  assert.ok(!found.some((p) => p.startsWith('самовольный')));
});

test('обнаружение не замыкается на само себя: политика — список, а не эхо дерева', () => {
  assert.deepEqual([...ROOT_CONTAINER_ALLOWLIST], ['scripts', 'tests']);
  // Положить манифест в корневой контейнер вне списка недостаточно, чтобы стать домом —
  // иначе кто положил манифест, тот и дом, и RootPolicy перестаёт быть политикой.
  const root = fixture(['apps/self-declared']);
  assert.deepEqual(listWorkshopManifests(root), []);
});

test('tests — поимённый корневой дом с мастерской', () => {
  const root = fixture(['tests']);
  const found = listWorkshopManifests(root).map((p) => p.slice(root.length + 1).replaceAll('\\', '/'));
  assert.deepEqual(found, ['tests/workshop.manifest.json']);
});

test('отсутствующий класс не роняет обход', () => {
  const onlyRoot = fixture(['scripts/one']);
  assert.equal(listWorkshopManifests(onlyRoot).length, 1, 'нет docs/ — не ошибка');
  assert.deepEqual(listWorkshopManifests(fixture([])), [], 'пустое дерево — честная пустота');
});

test('порядок обхода устойчив — дрейф справочника ловит содержание, а не перестановку', () => {
  const root = fixture(['docs/zeta', 'docs/alpha', 'scripts/beta']);
  const once = listWorkshopManifests(root);
  assert.deepEqual(once, [...once].sort(), 'выдача отсортирована, а не как отдаёт readdir');
  assert.deepEqual(listWorkshopManifests(root), once, 'повторный обход тождествен');
});
