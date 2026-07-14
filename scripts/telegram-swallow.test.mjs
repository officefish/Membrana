import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveSwallowText } from './telegram-swallow.mjs';

test('resolveSwallowText: позиционные аргументы склеиваются в текст', () => {
  assert.equal(resolveSwallowText(['Первая', 'новость', '--dry-run']), 'Первая новость');
  assert.equal(resolveSwallowText(['  однострочник  ']), 'однострочник');
});

test('resolveSwallowText: --file читает md (обе формы флага)', () => {
  const readFile = (path) => {
    assert.ok(String(path).replaceAll('\\', '/').endsWith('docs/comms/drafts/note.md'));
    return '**Из файла**\n';
  };
  assert.equal(resolveSwallowText(['--file', 'docs/comms/drafts/note.md'], readFile), '**Из файла**');
  assert.equal(resolveSwallowText(['--file=docs/comms/drafts/note.md'], readFile), '**Из файла**');
});

test('resolveSwallowText: пусто → пустая строка (main даст usage + exit 1)', () => {
  assert.equal(resolveSwallowText([]), '');
  assert.equal(resolveSwallowText(['--dry-run']), '');
});
