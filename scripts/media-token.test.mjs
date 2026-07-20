import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatMediaEnvCheck, pickMediaEnv } from './lib/media-token.mjs';

test('MEDIA_API_TOKEN из env — высший приоритет', () => {
  const r = pickMediaEnv({
    env: { MEDIA_API_URL: 'https://media.example', MEDIA_API_TOKEN: 'media-tok' },
    worktreeEnv: [{ path: '/main', url: null, token: 'other', mediaInternal: null, apiInternal: 'office' }],
  });
  assert.equal(r.url, 'https://media.example');
  assert.equal(r.token, 'media-tok');
  assert.equal(r.tokenSource, 'env:MEDIA_API_TOKEN');
});

test('без MEDIA_* не берём голый API_INTERNAL_TOKEN (office-плейсхолдер)', () => {
  const r = pickMediaEnv({
    env: { API_INTERNAL_TOKEN: 'placeholder9' },
    worktreeEnv: [],
  });
  assert.equal(r.token, null);
  assert.equal(r.tokenSource, null);
});

test('API_INTERNAL_TOKEN как media-fallback только при известном MEDIA_API_URL', () => {
  const r = pickMediaEnv({
    env: { MEDIA_API_URL: 'http://localhost:3010', API_INTERNAL_TOKEN: 'shared-internal' },
    worktreeEnv: [],
  });
  assert.equal(r.token, 'shared-internal');
  assert.match(r.tokenSource, /API_INTERNAL_TOKEN\(media-fallback\)/);
});

test('токен из соседнего worktree при пустом локальном env', () => {
  const r = pickMediaEnv({
    env: {},
    worktreeEnv: [
      { path: '/openrouter', url: null, token: null, mediaInternal: null, apiInternal: 'ph' },
      { path: '/main', url: 'https://media.membrana.space', token: 'real-media', mediaInternal: null, apiInternal: null },
    ],
  });
  assert.equal(r.url, 'https://media.membrana.space');
  assert.equal(r.token, 'real-media');
  assert.match(r.tokenSource, /worktree:\/main/);
});

test('formatMediaEnvCheck не печатает значение токена', () => {
  const { lines, ok } = formatMediaEnvCheck({
    url: 'https://media.example',
    token: 'secret-value-should-not-appear',
    urlSource: 'env:MEDIA_API_URL',
    tokenSource: 'env:MEDIA_API_TOKEN',
  });
  assert.equal(ok, true);
  assert.ok(lines.every((l) => !l.includes('secret-value')));
  assert.ok(lines.some((l) => /token: present/.test(l)));
});
