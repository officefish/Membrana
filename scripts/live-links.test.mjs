import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkLiveLinks,
  findNakedNumbers,
  expandLiveLinks,
  findBareRefs,
} from './lib/live-links.mjs';

test('разворачивает PR #N и голый #N', () => {
  const { text, expanded } = expandLiveLinks('См. PR #681 и ещё #679.');
  assert.equal(expanded, 2);
  assert.match(text, /\[PR #681\]\(https:\/\/github\.com\/officefish\/Membrana\/pull\/681\)/u);
  assert.match(text, /\[PR #679\]\(https:\/\/github\.com\/officefish\/Membrana\/pull\/679\)/u);
});

test('Issue #N → /issues/', () => {
  const { text } = expandLiveLinks('карточка Issue #609');
  assert.match(text, /\[Issue #609\]\(https:\/\/github\.com\/officefish\/Membrana\/issues\/609\)/u);
});

test('уже живая markdown-ссылка не дублируется', () => {
  const src = 'детали: [PR #681](https://github.com/officefish/Membrana/pull/681).';
  const { text, expanded } = expandLiveLinks(src);
  assert.equal(expanded, 0);
  assert.equal(text, src);
  assert.equal(checkLiveLinks(src).ok, true);
});

test('check ловит голые refs', () => {
  const { ok, bare } = checkLiveLinks('PR #1 и готово');
  assert.equal(ok, false);
  assert.equal(bare.length, 1);
  assert.deepEqual(findBareRefs('нет номеров'), []);
});

test('naked: кейс 26.07 — «задачи 1298, 1303» без решётки ловятся с номером строки', () => {
  const hits = findNakedNumbers('Подробности:\nзадачи 1298, 1303 закрыты');
  assert.deepEqual(hits.map((h) => h.n), [1298, 1303]);
  assert.equal(hits[0].line, 2);
});

test('naked: годы и числа без контекст-слова не шумят', () => {
  assert.deepEqual(findNakedNumbers('Установлено владельцем 24.07.2026 в задачах года'), []);
  assert.deepEqual(findNakedNumbers('порт 3010 поднят'), []);
});

test('naked: число внутри markdown-ссылки и после # не считается', () => {
  assert.deepEqual(findNakedNumbers('эпик [1220](https://github.com/x/y/issues/1220)'), []);
  assert.deepEqual(findNakedNumbers('задача #1310 живая'), []);
});

test('checkLiveLinks: naked валит ok, bare и naked раздельны', () => {
  const r = checkLiveLinks('Смотри задачи 1298 и Issue #77');
  assert.equal(r.ok, false);
  assert.equal(r.naked.length, 1);
  assert.equal(r.bare.length, 1);
});
