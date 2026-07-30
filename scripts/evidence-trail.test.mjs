import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  TRAIL_PROBLEMS,
  appendTrace,
  parseTrail,
  readTrail,
  serializeTrace,
  trailPathFor,
  validateTrace,
} from './lib/evidence-trail/trail.mjs';
import { TRACE_KINDS } from './lib/execution-trace/trace-kinds.mjs';
import { readTraceCorpus } from './lib/execution-trace/trace-corpus.mjs';

const trace = (over = {}) => ({
  traceId: 'tr-1',
  blockId: 'alpha-one',
  kind: TRACE_KINDS.CONTEXT_RUN,
  subject: 'dynin',
  at: '2026-07-30T10:00:00Z',
  ref: 'sha:abc123',
  ...over,
});

test('форма взята у ПОТРЕБИТЕЛЯ: запись ленты проходит readTraceCorpus гейта без адаптера', () => {
  // Несущее: лента подчиняется форме, объявленной гейтом односторонне и первым. Обратный
  // порядок дал бы носителю власть над предикатом, который его читает.
  const { traces, errors } = readTraceCorpus([trace()], { knownPersonas: ['dynin'] });
  assert.equal(errors.length, 0, `гейт принял запись ленты как есть: ${JSON.stringify(errors)}`);
  assert.equal(traces.length, 1);
});

test('валидная запись принимается', () => {
  assert.deepEqual(validateTrace(trace()), { ok: true, problems: [] });
});

test('род вне закрытого списка — ошибка входа, а не «прочее»', () => {
  const v = validateTrace(trace({ kind: 'recon' }));
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.startsWith(TRAIL_PROBLEMS.KIND_UNKNOWN)));
});

test('каждое обязательное поле названо ПОИМЁННО при отсутствии', () => {
  for (const f of ['traceId', 'blockId', 'kind', 'subject', 'at', 'ref']) {
    const v = validateTrace(trace({ [f]: undefined }));
    assert.equal(v.ok, false, `${f} обязано быть`);
    assert.ok(v.problems.some((p) => p.endsWith(f)), `причина называет поле ${f}, а не «запись плохая»`);
  }
});

test('пустая строка не считается значением поля', () => {
  assert.equal(validateTrace(trace({ subject: '   ' })).ok, false);
});

test('лента НЕ судит ответственность — только свою форму', () => {
  // Персона вне реестра голосов для ленты валидна: это предмет гейта. Вердикт из двух ртов —
  // та самая болезнь, ради которой разводились ведение и надзор.
  assert.equal(validateTrace(trace({ subject: 'кто-то-посторонний' })).ok, true);
});

test('битая строка — НАХОДКА с номером строки, а не молчаливый пропуск', () => {
  const text = `${serializeTrace(trace())}\n{битый json\n${serializeTrace(trace({ traceId: 'tr-2' }))}\n`;
  const r = parseTrail(text);
  assert.equal(r.traces.length, 2);
  assert.equal(r.problems.length, 1);
  assert.equal(r.problems[0].line, 2, 'номер строки назван');
  assert.deepEqual(r.problems[0].problems, [TRAIL_PROBLEMS.BROKEN_LINE]);
});

test('totalLines — знаменатель, которого гейту не хватало: отвергнутые видны', () => {
  const r = parseTrail(`${serializeTrace(trace())}\nмусор\n`);
  assert.equal(r.totalLines, 2, 'общее число строк');
  assert.equal(r.traces.length, 1, 'валидных меньше — разница и есть отвергнутое');
});

test('сериализация: порядок ключей стабилен, дифф ленты читаем', () => {
  assert.equal(serializeTrace(trace()), serializeTrace(trace()));
  assert.match(serializeTrace(trace()), /^\{"traceId":"tr-1","blockId":"alpha-one","kind":/u);
});

test('append-only: вторая запись дописывается, первая не переписана', () => {
  const root = mkdtempSync(join(tmpdir(), 'trail-'));
  try {
    assert.deepEqual(appendTrace(root, 'w-1', trace()), { appended: true, problems: [] });
    assert.deepEqual(appendTrace(root, 'w-1', trace({ traceId: 'tr-2' })), { appended: true, problems: [] });
    const text = readFileSync(join(root, trailPathFor('w-1')), 'utf8');
    assert.equal(text.trim().split('\n').length, 2, 'обе записи на месте');
    assert.match(text, /"traceId":"tr-1"/u, 'первая не переписана — вещдок нельзя отредактировать задним числом');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('невалидная запись в ленту НЕ попадает, и отказ назван причиной, а не исключением', () => {
  const root = mkdtempSync(join(tmpdir(), 'trail-'));
  try {
    const r = appendTrace(root, 'w-1', trace({ kind: 'recon' }));
    assert.equal(r.appended, false);
    assert.ok(r.problems.length > 0);
    assert.equal(readTrail(root, 'w-1').exists, false, 'файл даже не создан');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('ленты нет → пустой корпус С ПРИЗНАКОМ exists:false, а не молчаливый ноль', () => {
  const root = mkdtempSync(join(tmpdir(), 'trail-'));
  try {
    const r = readTrail(root, 'нет-такого-окна');
    assert.deepEqual(r.traces, []);
    assert.equal(r.exists, false, '«ленты нет» отличимо от «лента пуста»');
    assert.equal(r.totalLines, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('окно адресуется id, а не датой: дата не уникальна', () => {
  assert.equal(trailPathFor('sprint-mfcc-1'), 'docs/sprint/trail/sprint-mfcc-1.jsonl');
});
