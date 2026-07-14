import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRng,
  estimateMemoryTokens,
  formatRoleOrderLine,
  MEMORY_TOKENS_GUARD,
  resolveSeansePath,
  resolveWithMemory,
  shuffleRoles,
  slugify,
  CONSILIUM_ROLES,
} from './lib/consilium-paths.mjs';

test('slugify: кириллица и пустой fallback', () => {
  assert.equal(slugify('Нужен ли пакет брендбука?'), 'нужен-ли-пакет-брендбука');
  assert.equal(slugify('   '), 'consilium');
});

test('resolveSeansePath: save-as и дата', () => {
  const d = new Date('2026-05-15T12:00:00Z');
  assert.equal(
    resolveSeansePath({ saveAs: 'brandbook', question: 'x', date: d }),
    'docs/seanses/brandbook-2026-05-15.md',
  );
});

test('shuffleRoles: seed воспроизводим', () => {
  const a = shuffleRoles(CONSILIUM_ROLES, 42).map((r) => r.key);
  const b = shuffleRoles(CONSILIUM_ROLES, 42).map((r) => r.key);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, CONSILIUM_ROLES.map((r) => r.key));
});

test('createRng детерминирован', () => {
  const r1 = createRng(1);
  const r2 = createRng(1);
  assert.equal(r1(), r2());
});

test('formatRoleOrderLine', () => {
  const line = formatRoleOrderLine([CONSILIUM_ROLES[0], CONSILIUM_ROLES[1]]);
  assert.match(line, /Teamlead/);
  assert.match(line, /Структурщик/);
});

test('resolveWithMemory (#451): default ON, --no-memory/env=0 выключают, --with-memory перебивает env', () => {
  assert.equal(resolveWithMemory([]), true);
  assert.equal(resolveWithMemory(['--no-memory']), false);
  assert.equal(resolveWithMemory([], { PERSONA_MEMORY_INJECT: '0' }), false);
  assert.equal(resolveWithMemory(['--with-memory'], { PERSONA_MEMORY_INJECT: '0' }), true);
  assert.equal(resolveWithMemory(['--no-memory', '--with-memory']), false, 'явный no-memory сильнее');
  assert.equal(resolveWithMemory([], { PERSONA_MEMORY_INJECT: '1' }), true);
});

test('estimateMemoryTokens / MEMORY_TOKENS_GUARD (#451)', () => {
  assert.equal(estimateMemoryTokens(0), 0);
  assert.equal(estimateMemoryTokens(100_000), 25_000);
  assert.equal(estimateMemoryTokens(100_000) > MEMORY_TOKENS_GUARD, false, 'ровно на гарде — не превышение');
  assert.equal(estimateMemoryTokens(120_000) > MEMORY_TOKENS_GUARD, true);
});
