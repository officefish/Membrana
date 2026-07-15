/**
 * Тесты трёхстороннего слияния реестра (#476 п.1).
 *
 * Главный кейс — «правка обеих сторон не теряется»: 2026-07-15 ручное слияние
 * «main за базу» молча откатило правку 26 карточек. Драйвер обязан либо слить
 * честно, либо позвать человека — но не терять.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeCard, mergeRegistries } from './lib/registry-merge.mjs';

const card = (id, extra = {}) => ({ id, title: id, status: 'active', githubIssue: null, ...extra });
const reg = (...tasks) => ({ version: 1, tasks });

// ─── карточка ─────────────────────────────────────────────────────────────────────

test('не менялась у нас → берём их версию', () => {
  const base = card('a', { status: 'active' });
  const ours = card('a', { status: 'active' });
  const theirs = card('a', { status: 'archived' });
  assert.deepEqual(mergeCard(base, ours, theirs), { card: theirs });
});

test('не менялась у них → берём нашу (правка не теряется)', () => {
  // Живой случай 15.07: мы обнулили githubIssue, main карточку не трогал.
  const base = card('dpr-dr1-ci-gate', { githubIssue: 94 });
  const ours = card('dpr-dr1-ci-gate', { githubIssue: null });
  const theirs = card('dpr-dr1-ci-gate', { githubIssue: 94 });
  assert.deepEqual(mergeCard(base, ours, theirs), { card: ours }, 'наш фикс обязан выжить');
});

test('обе стороны сделали одно и то же → не конфликт', () => {
  const base = card('a', { status: 'active' });
  const same = card('a', { status: 'archived' });
  assert.deepEqual(mergeCard(base, { ...same }, { ...same }), { card: same });
});

test('обе стороны правили по-разному → КОНФЛИКТ, а не угадывание', () => {
  const base = card('a', { status: 'active' });
  const ours = card('a', { status: 'archived' });
  const theirs = card('a', { status: 'active', title: 'переименована' });
  const res = mergeCard(base, ours, theirs);
  assert.ok('conflict' in res, 'угадать нельзя — зовём человека');
});

test('новая карточка только у одной стороны → берётся', () => {
  assert.deepEqual(mergeCard(undefined, card('new'), undefined), { card: card('new') });
  assert.deepEqual(mergeCard(undefined, undefined, card('new')), { card: card('new') });
});

test('один id заведён обеими сторонами по-разному → конфликт', () => {
  const res = mergeCard(undefined, card('x', { title: 'наш' }), card('x', { title: 'их' }));
  assert.ok('conflict' in res);
});

// ─── реестр целиком ───────────────────────────────────────────────────────────────

test('головные вставки обеих сторон сохраняются (наши → их → база)', () => {
  const base = reg(card('old1'), card('old2'));
  const ours = reg(card('mine'), card('old1'), card('old2'));
  const theirs = reg(card('theirs'), card('old1'), card('old2'));
  const res = mergeRegistries(base, ours, theirs);
  assert.ok(res.ok);
  assert.deepEqual(
    res.registry.tasks.map((t) => t.id),
    ['mine', 'theirs', 'old1', 'old2'],
    'ни одна головная вставка не потеряна',
  );
});

test('живой сценарий 15.07: наш фикс поля + чужие новые карточки — всё выживает', () => {
  const base = reg(card('dpr-dr1', { githubIssue: 94 }), card('dpr-dr2', { githubIssue: 94 }));
  // Мы обнулили Issue у обеих фаз и завели свою карточку.
  const ours = reg(
    card('canon-tooling-debt'),
    card('dpr-dr1', { githubIssue: null }),
    card('dpr-dr2', { githubIssue: null }),
  );
  // Соседняя сессия завела свои карточки, фазы не трогала.
  const theirs = reg(card('pc-2a'), card('pc-2b'), card('dpr-dr1', { githubIssue: 94 }), card('dpr-dr2', { githubIssue: 94 }));
  const res = mergeRegistries(base, ours, theirs);
  assert.ok(res.ok);
  const byId = new Map(res.registry.tasks.map((t) => [t.id, t]));
  assert.equal(byId.get('dpr-dr1').githubIssue, null, 'фикс ti-2 не откатился');
  assert.equal(byId.get('dpr-dr2').githubIssue, null);
  assert.ok(byId.get('canon-tooling-debt'), 'наша карточка на месте');
  assert.ok(byId.get('pc-2a') && byId.get('pc-2b'), 'чужие карточки не потеряны');
  assert.equal(res.registry.tasks.length, 5);
});

test('конфликт возвращается списком id, а не тихим выбором', () => {
  const base = reg(card('a', { status: 'active' }));
  const ours = reg(card('a', { status: 'archived' }));
  const theirs = reg(card('a', { status: 'active', title: 'другое' }));
  const res = mergeRegistries(base, ours, theirs);
  assert.equal(res.ok, false);
  assert.deepEqual(res.conflicts.map((c) => c.id), ['a']);
});

test('карточка, удалённая одной стороной и нетронутая другой, удаляется', () => {
  const base = reg(card('a'), card('b'));
  const ours = reg(card('a'));
  const theirs = reg(card('a'), card('b'));
  const res = mergeRegistries(base, ours, theirs);
  assert.ok(res.ok);
  assert.deepEqual(res.registry.tasks.map((t) => t.id), ['a']);
});

test('шапка берётся из их версии (version меняет ушедшая вперёд сторона)', () => {
  const res = mergeRegistries({ version: 1, tasks: [] }, { version: 1, tasks: [] }, { version: 2, tasks: [] });
  assert.ok(res.ok);
  assert.equal(res.registry.version, 2);
});
