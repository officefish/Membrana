import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkLiveLinks,
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
