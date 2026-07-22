import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractUtterances, findUtterances, rawScan } from './lib/transcript.mjs';
import { askCheckMatches } from './truth.mjs';

const rec = (o) => JSON.stringify(o);

function fixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), 'transcript-test-'));
  const lines = [
    // 1. user, content-строка
    rec({ type: 'user', sessionId: 's1', uuid: 'u1', timestamp: 't1', message: { role: 'user', content: 'редис вместо монго' } }),
    // 1а. user, content-массив text-блоков
    rec({ type: 'user', sessionId: 's1', uuid: 'u2', timestamp: 't2', message: { role: 'user', content: [{ type: 'text', text: 'подогнать архив нельзя' }] } }),
    // 2. queued_command, prompt-строка (реплика посреди хода)
    rec({ type: 'attachment', sessionId: 's1', uuid: 'u3', timestamp: 't3', attachment: { type: 'queued_command', prompt: 'гонка CURRENT_TASK решена' } }),
    // 2а. queued_command, prompt-массив
    rec({ type: 'attachment', sessionId: 's1', uuid: 'u4', timestamp: 't4', attachment: { type: 'queued_command', prompt: [{ type: 'text', text: 'ласточка ушла Алексу вчера' }] } }),
    // 3. tool_result внутри user (клик по вариантам)
    rec({ type: 'user', sessionId: 's1', uuid: 'u5', timestamp: 't5', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'выбран вариант Б: амнистия' }] } }),
    // шум: assistant и служебные типы
    rec({ type: 'assistant', sessionId: 's1', uuid: 'u6', message: { role: 'assistant', content: [{ type: 'text', text: 'редис вместо монго — принято' }] } }),
    // битый JSON — достаёт только rawScan
    '{"type":"user","uuid":"u7","message":{"content":"уникальный-битый-фрагмент"',
  ];
  writeFileSync(join(dir, 's1.jsonl'), lines.join('\n') + '\n');
  return dir;
}

test('extractUtterances: user-строка и user-массив', () => {
  assert.deepEqual(
    extractUtterances({ type: 'user', message: { content: 'привет' } }),
    [{ kind: 'user', text: 'привет' }],
  );
  assert.deepEqual(
    extractUtterances({ type: 'user', message: { content: [{ type: 'text', text: 'а' }] } }),
    [{ kind: 'user', text: 'а' }],
  );
});

test('extractUtterances: queued_command — И строка, И массив (замер 19.07: 21/50)', () => {
  assert.deepEqual(
    extractUtterances({ type: 'attachment', attachment: { type: 'queued_command', prompt: 'x' } }),
    [{ kind: 'queued_command', text: 'x' }],
  );
  assert.deepEqual(
    extractUtterances({ type: 'attachment', attachment: { type: 'queued_command', prompt: [{ type: 'text', text: 'y' }] } }),
    [{ kind: 'queued_command', text: 'y' }],
  );
});

test('extractUtterances: tool_result внутри user; чужие типы — пусто', () => {
  const [u] = extractUtterances({
    type: 'user',
    message: { content: [{ type: 'tool_result', content: 'клик' }] },
  });
  assert.equal(u.kind, 'tool_result');
  assert.deepEqual(extractUtterances({ type: 'assistant', message: { content: 'z' } }), []);
  assert.deepEqual(extractUtterances({ type: 'ai-title' }), []);
});

test('findUtterances находит во всех трёх местах (корень #595: user-фильтр слеп)', () => {
  const dir = fixtureDir();
  assert.equal(findUtterances('редис вместо монго', { dir })[0].kind, 'user');
  assert.equal(findUtterances('гонка CURRENT_TASK', { dir })[0].kind, 'queued_command');
  assert.equal(findUtterances('ласточка ушла Алексу', { dir })[0].kind, 'queued_command');
  assert.equal(findUtterances('амнистия', { dir })[0].kind, 'tool_result');
  // assistant-реплика с тем же текстом НЕ выдаётся за владельческую
  assert.equal(findUtterances('редис вместо монго', { dir }).length, 1);
});

test('findUtterances: промах → пустой массив, указатель несёт sessionId/uuid/timestamp', () => {
  const dir = fixtureDir();
  assert.deepEqual(findUtterances('такого-нет', { dir }), []);
  const [hit] = findUtterances('подогнать архив', { dir });
  assert.equal(hit.sessionId, 's1');
  assert.equal(hit.uuid, 'u2');
  assert.equal(hit.timestamp, 't2');
});

test('Cursor agent-transcripts: role=user + user_query + nested jsonl', () => {
  const dir = mkdtempSync(join(tmpdir(), 'transcript-cursor-'));
  const session = 'ec290f46-5bd6-4f70-860a-4e069c64c474';
  const nested = join(dir, session);
  mkdirSync(nested);
  writeFileSync(
    join(nested, `${session}.jsonl`),
    [
      rec({
        role: 'user',
        message: {
          content: [
            {
              type: 'text',
              text: '<timestamp>Wednesday, Jul 22, 2026, 7:30 PM (UTC+3)</timestamp>\n<user_query>\nA\n</user_query>',
            },
          ],
        },
      }),
      rec({ role: 'assistant', message: { content: [{ type: 'text', text: 'noise A' }] } }),
    ].join('\n') + '\n',
  );
  const [hit] = findUtterances('A', { dir });
  assert.equal(hit.text, 'A');
  assert.equal(hit.sessionId, session);
  assert.equal(hit.uuid, 'cursor-line-1');
  assert.ok(hit.timestamp);
});

test('rawScan ловит то, что структурный парс не достал (битый JSON)', () => {
  const dir = fixtureDir();
  assert.deepEqual(findUtterances('уникальный-битый-фрагмент', { dir }), []);
  const raw = rawScan('уникальный-битый-фрагмент', { dir });
  assert.equal(raw.length, 1);
  assert.ok(raw[0].line > 0);
});

test('askCheckMatches: вопрос находит живой токен-ответ (регресс эпизода 18.07)', () => {
  const registry = {
    tokens: [
      {
        id: 'alex-sparring-answered',
        status: 'active',
        claim: 'Ласточка со спаррингом отправлена Алексу и получен ответ',
        source: { note: 'отправка подтверждена 17.07' },
      },
      { id: 'archived-noise', status: 'revoked', claim: 'ласточка Алексу — старый отозванный' },
    ],
    openGaps: ['не решено: дождаться ли ответа Алекса на ласточку со спаррингом'],
  };
  const res = askCheckMatches(registry, 'ушла ли ласточка Алексу');
  assert.equal(res.tokens.length, 1);
  assert.equal(res.tokens[0].id, 'alex-sparring-answered');
  assert.equal(res.gaps.length, 1);
});

test('askCheckMatches: revoked-токены не считаются ответом; чужие слова — пусто', () => {
  const registry = {
    tokens: [{ id: 'x', status: 'revoked', claim: 'проксирование через воронеж' }],
    openGaps: [],
  };
  assert.equal(askCheckMatches(registry, 'проксирование через воронеж').tokens.length, 0);
  assert.equal(askCheckMatches(registry, 'совсем другая тема').tokens.length, 0);
});
