/**
 * Зуб session-mining: реплика ≠ служебное событие, указатель обязателен, окно честное.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  foldScanLine,
  formatPointer,
  fragmentAround,
  inWindow,
  matchesInReply,
  replyText,
  sessionIdOf,
} from './session-mining.mjs';

test('replyText: user/assistant с текстом — реплика; system/tool — нет', () => {
  assert.equal(replyText({ type: 'user', message: { content: 'привет' } }), 'привет');
  assert.equal(replyText({ type: 'assistant', message: { content: [{ type: 'text', text: 'а' }, { type: 'tool_use', name: 'x' }] } }), 'а');
  assert.equal(replyText({ type: 'system', message: { content: 'служебное' } }), null);
  assert.equal(replyText({ type: 'user', message: { content: [{ type: 'tool_result', content: 'мостик в выводе' }] } }), null);
});

test('matchesInReply: маркер в tool-результате НЕ делает событие цитатой', () => {
  const toolEvent = { type: 'user', message: { content: [{ type: 'tool_result', content: 'мостик' }] } };
  assert.equal(matchesInReply(toolEvent, 'мостик'), false);
  assert.equal(matchesInReply({ type: 'user', message: { content: 'идём на мостик' } }, 'мостик'), true);
});

test('inWindow: границы включительно, событие без timestamp не попадает', () => {
  const e = { timestamp: '2026-07-22T09:25:52.993Z' };
  assert.ok(inWindow(e, '2026-07-22T09:18', '2026-07-22T09:35'));
  assert.ok(!inWindow(e, '2026-07-22T09:30', null));
  assert.ok(!inWindow({}, '2026-07-22T09:00', null));
});

test('formatPointer: форма указателя ровно та, что в Raw кейсов', () => {
  const p = formatPointer({ uuid: 'u-1', timestamp: 'T' }, 's-1');
  assert.equal(p, '{sessionId: s-1, uuid: u-1, timestamp: T}');
});

test('foldScanLine: первая/последняя метка и счётчик маркера копятся', () => {
  const st = { first: null, last: null, counts: {} };
  foldScanLine('{"timestamp":"2026-07-21T11:03:00Z","x":"мостик"}', ['мостик'], st);
  foldScanLine('{"timestamp":"2026-07-22T09:25:52Z"}', ['мостик'], st);
  assert.equal(st.first, '2026-07-21T11:03:00Z');
  assert.equal(st.last, '2026-07-22T09:25:52Z');
  assert.equal(st.counts['мостик'], 1);
});

test('fragmentAround и sessionIdOf — служебные мелочи честны', () => {
  assert.ok(fragmentAround('abc мостик def', 'мостик', 4, 7).includes('мостик'));
  assert.equal(sessionIdOf('7f931953-ca19.jsonl'), '7f931953-ca19');
});
