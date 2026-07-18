/**
 * NB4 ночь 17.07 — резолв OFFICE_API_TOKEN из worktree репозитория.
 * Тестируем чистое ядро pickOfficeToken + parseEnvKey (без git/fs).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseEnvKey, pickOfficeToken } from './lib/office-token.mjs';

test('локальный OFFICE_API_TOKEN — высший приоритет', () => {
  const r = pickOfficeToken({ env: { OFFICE_API_TOKEN: 'local-64' }, worktreeTokens: [{ path: '/main', token: 'wt' }] });
  assert.deepEqual(r, { token: 'local-64', source: 'env:OFFICE_API_TOKEN' });
});

test('нет локального OFFICE → берём из соседнего worktree (кейс 17.07)', () => {
  const r = pickOfficeToken({
    env: { API_INTERNAL_TOKEN: 'placeholder9' },
    worktreeTokens: [{ path: '/openrouter', token: null }, { path: '/main', token: 'real-64' }],
  });
  assert.equal(r.token, 'real-64');
  assert.equal(r.source, 'worktree:/main');
});

test('API_INTERNAL_TOKEN — только последний резерв (в openrouter это плейсхолдер → 401)', () => {
  const r = pickOfficeToken({ env: { API_INTERNAL_TOKEN: 'placeholder9' }, worktreeTokens: [{ path: '/x', token: null }] });
  assert.equal(r.source, 'env:API_INTERNAL_TOKEN(fallback)');
});

test('ничего нет → token null', () => {
  assert.deepEqual(pickOfficeToken({ env: {}, worktreeTokens: [] }), { token: null, source: null });
});

test('parseEnvKey: значение в кавычках/с export снимается', () => {
  const fake = (p) => (p === '/e' ? 'export OFFICE_API_TOKEN="abc123"\nAPI_INTERNAL_TOKEN=xxxxxxxxx\n' : '');
  const exists = () => true;
  assert.equal(parseEnvKey('/e', 'OFFICE_API_TOKEN', fake, exists), 'abc123');
  assert.equal(parseEnvKey('/e', 'API_INTERNAL_TOKEN', fake, exists), 'xxxxxxxxx');
});

test('parseEnvKey: нет файла → null', () => {
  assert.equal(parseEnvKey('/missing', 'OFFICE_API_TOKEN', () => '', () => false), null);
});
