import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ALLOW_MARKER, detectEncodingIssues } from './verify-encoding.mjs';

const clean = (s) => Buffer.from(s, 'utf8');

test('чистый русский/английский текст проходит (включая «Рёв» — не сигнатура)', () => {
  assert.deepEqual(detectEncodingIssues('a.md', clean('# Заголовок\nРёв мотора дрона — норма.')), []);
  assert.deepEqual(detectEncodingIssues('b.md', clean('plain english, em—dash, «кавычки»')), []);
});

test('BOM ловится', () => {
  const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), clean('# ok')]);
  const issues = detectEncodingIssues('bom.md', withBom);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /BOM/);
});

test('двойная перекодировка ловится с номером строки', () => {
  // «— текст «в кавычках»» после UTF-8→cp1251→UTF-8
  const mojibake = clean('строка 1\nвЂ” РЎРµРіРѕРґРЅСЏ\n');
  const issues = detectEncodingIssues('moji.md', mojibake);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /moji\.md:2:/);
  assert.match(issues[0], /cp1251/);
});

test('BOM и mojibake репортятся одновременно', () => {
  const both = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), clean('РЎ')]);
  assert.equal(detectEncodingIssues('x.md', both).length, 2);
});

test('allow-маркер снимает mojibake-проверку (цитаты сигнатур), но НЕ BOM', () => {
  const quoted = clean(`док про гард: сигнатуры «РЎ», «вЂ»\n${ALLOW_MARKER}\n`);
  assert.deepEqual(detectEncodingIssues('guard-doc.md', quoted), []);
  const bomAndMarker = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), quoted]);
  const issues = detectEncodingIssues('guard-doc.md', bomAndMarker);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /BOM/);
});
