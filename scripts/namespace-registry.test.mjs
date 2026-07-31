/**
 * Зубы реестра неймспейсов (§1 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/namespace-registry.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  REGISTRY_REL,
  REGISTRY_SCHEMA,
  REGISTRY_STATES,
  projectNamespaces,
  readRegistry,
  renderRegistryLine,
} from './lib/namespace-registry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Временный корень с произвольным содержимым реестра. */
function withRegistry(content) {
  const root = mkdtempSync(join(tmpdir(), 'ns-registry-'));
  if (content !== null) {
    mkdirSync(join(root, 'docs', 'namespaces'), { recursive: true });
    writeFileSync(join(root, REGISTRY_REL), content, 'utf8');
  }
  return root;
}

const rec = (over = {}) => ({
  id: 'ritual',
  title: 'Ритуальный контур',
  holder: { persona: 'angelina' },
  membership: { kind: 'namePrefix', value: 'ritual-' },
  ...over,
});

test('живой реестр репозитория читается и валиден', () => {
  const res = readRegistry(repoRoot);
  assert.equal(res.state, REGISTRY_STATES.OK, res.problems.join('; '));
});

test('три состояния не схлопнуты: нет файла ≠ битый ≠ пустой', () => {
  const absent = readRegistry(withRegistry(null));
  assert.equal(absent.state, REGISTRY_STATES.ABSENT);

  const broken = readRegistry(withRegistry('{ не json'));
  assert.equal(broken.state, REGISTRY_STATES.UNREADABLE);

  const empty = readRegistry(withRegistry(JSON.stringify({ schema: REGISTRY_SCHEMA, namespaces: [] })));
  assert.equal(empty.state, REGISTRY_STATES.OK, 'пустой, но прочитанный реестр — состояние ok');
  assert.deepEqual(empty.namespaces, []);
});

test('пустой реестр НЕ печатается как «чисто»', () => {
  const line = renderRegistryLine(readRegistry(withRegistry(JSON.stringify({ schema: REGISTRY_SCHEMA, namespaces: [] }))));
  assert.match(line, /правил ноль/u);
  assert.match(line, /НЕ «всё припарковано»/u, 'отчёт обязан отличать «правил нет» от «всё разложено»');
  assert.doesNotMatch(line, /\bчисто\b/u);
});

test('схема обязательна: чужой документ не читается как реестр', () => {
  const wrong = readRegistry(withRegistry(JSON.stringify({ namespaces: [rec()] })));
  assert.equal(wrong.state, REGISTRY_STATES.INVALID);
  assert.match(wrong.problems.join('\n'), /schema=\(нет\)/u);
  // Записи при испорченной форме НЕ отдаются: половина прочитанного реестра хуже нечитанного.
  assert.deepEqual(wrong.namespaces, []);
});

test('порча записи роняет весь реестр, а не проходит частично', () => {
  const res = readRegistry(withRegistry(JSON.stringify({ schema: REGISTRY_SCHEMA, namespaces: [rec(), rec({ id: 'broken', holder: {} })] })));
  assert.equal(res.state, REGISTRY_STATES.INVALID);
  assert.match(res.problems.join('\n'), /broken: holder пуст/u);
  assert.deepEqual(res.namespaces, []);
});

test('проекция производна: лишнее поле в записи в справочник не протекает', () => {
  const projected = projectNamespaces([rec({ containerKind: 'bidi', внезапно: 'мусор' })]);
  assert.deepEqual(Object.keys(projected[0]), ['id', 'title', 'holder', 'membership', 'containerKind']);
  assert.equal(projected[0].holder, 'angelina', 'держатель разворачивается в одно значение');
  assert.equal(projected[0].containerKind, 'bidi');
});

test('проекция: ownerRef как держатель и порядок по id', () => {
  const projected = projectNamespaces([rec({ id: 'zeta' }), rec({ id: 'alpha', holder: { ownerRef: '#1467' } })]);
  assert.deepEqual(projected.map((p) => p.id), ['alpha', 'zeta']);
  assert.equal(projected[0].holder, '#1467');
  assert.equal(projected[1].containerKind, 'plain', 'умолчание проставлено, а не оставлено пустым');
});

test('путь реестра — один и тот же для всех потребителей', () => {
  assert.equal(REGISTRY_REL, 'docs/namespaces/REGISTRY.json');
});

test('временные корни убраны за собой', () => {
  const root = withRegistry(JSON.stringify({ schema: REGISTRY_SCHEMA, namespaces: [] }));
  rmSync(root, { recursive: true, force: true });
  assert.equal(readRegistry(root).state, REGISTRY_STATES.ABSENT);
});
