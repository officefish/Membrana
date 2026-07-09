import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizeEol, wireFreshness } from './verify-wire-sync.mjs';
import { generateWireSource, root, WIRE_TARGET } from './generate-wire-contract.mjs';

test('wireFreshness: идентичные тексты — fresh', () => {
  const text = 'a\nb\nc\n';
  assert.deepEqual(wireFreshness(text, text), { fresh: true, firstDiffLine: null });
});

test('wireFreshness: CRLF-вариант того же текста — fresh (Windows checkout)', () => {
  assert.equal(wireFreshness('a\nb\n', 'a\r\nb\r\n').fresh, true);
  assert.equal(normalizeEol('x\r\ny'), 'x\ny');
});

test('wireFreshness: расхождение — stale с номером первой строки', () => {
  const r = wireFreshness('a\nb\nc\n', 'a\nB\nc\n');
  assert.equal(r.fresh, false);
  assert.equal(r.firstDiffLine, 2);
});

test('wireFreshness: недостающий хвост — stale', () => {
  const r = wireFreshness('a\nb\nc\n', 'a\nb\n');
  assert.equal(r.fresh, false);
  assert.equal(r.firstDiffLine, 3);
});

test('реальный checked-in node-realtime-wire.ts свеж относительно core-канона', () => {
  const expected = generateWireSource();
  const actual = readFileSync(resolve(root, WIRE_TARGET), 'utf8');
  const { fresh, firstDiffLine } = wireFreshness(expected, actual);
  assert.equal(
    fresh,
    true,
    `node-realtime-wire.ts stale (первое расхождение: строка ${firstDiffLine}) — запусти yarn wire:generate`,
  );
});
