import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ALWAYS_YES_PROFILE, applyProfile, removeProfile, isActive } from './always-yes.mjs';

const PROFILE = { allow: ['Bash(git:*)', 'Edit'], deny: ['Bash(ssh:*)', 'Edit(packages/core/**)'] };

test('applyProfile: вливает allow/deny и ставит маркер', () => {
  const out = applyProfile({}, PROFILE);
  assert.deepEqual(out.permissions.allow, ['Bash(git:*)', 'Edit']);
  assert.deepEqual(out.permissions.deny, ['Bash(ssh:*)', 'Edit(packages/core/**)']);
  assert.ok(isActive(out));
});

test('applyProfile: сохраняет ручные разрешения и прочие ключи, дедуп', () => {
  const base = {
    env: { HTTP_PROXY: 'http://x' },
    permissions: { allow: ['Bash(git:*)', 'Bash(gh pr:*)'] },
  };
  const out = applyProfile(base, PROFILE);
  assert.deepEqual(out.env, { HTTP_PROXY: 'http://x' });
  // git:* уже был — не задваивается; ручной gh pr сохранён; Edit добавлен
  assert.deepEqual(out.permissions.allow, ['Bash(git:*)', 'Bash(gh pr:*)', 'Edit']);
});

test('removeProfile: снимает РОВНО добавленные записи, ручные остаются', () => {
  const base = { permissions: { allow: ['Bash(gh pr:*)'] } };
  const on = applyProfile(base, PROFILE);
  const off = removeProfile(on);
  assert.deepEqual(off.permissions.allow, ['Bash(gh pr:*)']); // ручной уцелел
  assert.equal(off.permissions.deny, undefined); // все deny были наши → ключ убран
  assert.ok(!isActive(off));
});

test('removeProfile: пустой permissions удаляется целиком', () => {
  const off = removeProfile(applyProfile({}, PROFILE));
  assert.equal(off.permissions, undefined);
});

test('applyProfile идемпотентен: повторное включение не задваивает и не растит маркер', () => {
  const once = applyProfile({}, PROFILE);
  const twice = applyProfile(once, PROFILE);
  assert.deepEqual(twice.permissions.allow, once.permissions.allow);
  assert.deepEqual(twice.permissions.deny, once.permissions.deny);
  assert.deepEqual(twice.permissions._alwaysYesAdded, once.permissions._alwaysYesAdded);
});

test('off после off — no-op (идемпотентно)', () => {
  const off = removeProfile(applyProfile({}, PROFILE));
  assert.deepEqual(removeProfile(off), off);
});

test('дефолтный ALWAYS_YES_PROFILE: deny перекрывает опасное', () => {
  assert.ok(ALWAYS_YES_PROFILE.deny.some((p) => /force/.test(p)));
  assert.ok(ALWAYS_YES_PROFILE.deny.some((p) => /deploy:prod/.test(p)));
  assert.ok(ALWAYS_YES_PROFILE.deny.some((p) => /packages\/core/.test(p)));
  assert.ok(ALWAYS_YES_PROFILE.allow.includes('Edit'));
});
