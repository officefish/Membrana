/**
 * NB5 (тулинг заседания night-build-format, кандидат 5): merge-handoff из коммитов.
 * Тестируем чистое ядро extractFollowUps (collectBranchHandoff — git-обёртка,
 * проверяется её graceful-ветка).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectBranchHandoff, extractFollowUps } from './lib/night-build.mjs';

test('extractFollowUps: тянет follow-up: из тел коммитов', () => {
  const text = [
    'fix(x): что-то\n\nfollow-up: вернуть message_id в telegram.client',
    'feat(y): другое\n\nFollow-Up: задеплоить office утром',
  ].join('\n');
  assert.deepEqual(extractFollowUps(text), [
    'вернуть message_id в telegram.client',
    'задеплоить office утром',
  ]);
});

test('extractFollowUps: дедуплицирует и игнорирует пустое', () => {
  const text = 'follow-up: одно\nfollow-up: одно\nfollowup:   \nобычная строка';
  assert.deepEqual(extractFollowUps(text), ['одно']);
});

test('extractFollowUps: нет тегов → пустой список', () => {
  assert.deepEqual(extractFollowUps('feat: без тегов\n\nтело'), []);
});

test('extractFollowUps: пустой/undefined вход безопасен', () => {
  assert.deepEqual(extractFollowUps(''), []);
  assert.deepEqual(extractFollowUps(undefined), []);
});

test('collectBranchHandoff: git недоступен → безопасный ok:false', () => {
  // несуществующий cwd → execFileSync бросит → graceful
  const r = collectBranchHandoff('nonexistent-branch', 'origin/main', '/no/such/dir/xyz');
  assert.equal(r.ok, false);
  assert.deepEqual(r.commits, []);
  assert.deepEqual(r.followUps, []);
});
