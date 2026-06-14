import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRng,
  formatRoleOrderLine,
  resolveSeansePath,
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
