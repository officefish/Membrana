/**
 * Зубы разбора транскрипта на вызовы инструментов (§8 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/tool-use-trace.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  SEARCH_TOOLS,
  classifyCall,
  readTranscript,
  scanSessions,
  sessionSignals,
  toolUsesOfRecord,
} from './lib/tool-use-trace.mjs';

/** Запись ассистента с блоками вызовов. */
const rec = (...blocks) => ({ type: 'assistant', message: { content: blocks } });
const use = (name, input = {}) => ({ type: 'tool_use', id: 'x', name, input });
const bash = (command) => use('Bash', { command });

test('вызовы извлекаются из блоков tool_use — того, чего transcript.mjs не умеет', () => {
  const calls = toolUsesOfRecord(rec(use('Read'), bash('yarn scripts:orphans'), { type: 'text', text: 'проза' }));
  assert.deepEqual(calls.map((c) => c.name), ['Read', 'Bash']);
  assert.equal(calls[1].command, 'yarn scripts:orphans');
});

test('чужие формы записи не роняют разбор', () => {
  assert.deepEqual(toolUsesOfRecord(null), []);
  assert.deepEqual(toolUsesOfRecord({ type: 'user', message: { content: 'строка' } }), []);
  assert.deepEqual(toolUsesOfRecord(rec({ type: 'tool_result', content: 'вывод' })), []);
});

test('три рода вызова, и «other» — честный третий, а не свалка', () => {
  assert.equal(classifyCall('Grep'), 'search');
  assert.equal(classifyCall('Glob'), 'search');
  assert.equal(classifyCall('Bash', 'yarn tooling:overview'), 'workshop');
  assert.equal(classifyCall('Bash', 'node scripts/belongs-tooth.mjs'), 'workshop');
  // Чтение файла, правка, тест — не разведка и не мастерская. Записать их в одно из двух
  // значило бы подгонять числитель под предикат.
  assert.equal(classifyCall('Read'), 'other');
  assert.equal(classifyCall('Edit'), 'other');
  assert.equal(classifyCall('Bash', 'git status'), 'other');
});

test('Read разведкой не считается — §8 не запрещает поиск при известном инструменте', () => {
  assert.deepEqual([...SEARCH_TOOLS], ['Grep', 'Glob']);
  assert.equal(classifyCall('Read'), 'other', 'чтение известного файла — не поиск вслепую');
});

test('греп через оболочку — та же разведка, только мимо инструмента', () => {
  assert.equal(classifyCall('Bash', 'grep -rn foo src/'), 'search');
  assert.equal(classifyCall('Bash', 'rg foo'), 'search');
  assert.equal(classifyCall('Bash', 'find . -name "*.mjs"'), 'search');
  // Но не любое вхождение подстроки: слово внутри пути инструментом не делает.
  assert.equal(classifyCall('Bash', 'node scripts/grep-report.mjs'), 'workshop');
});

test('первое действие считается по СОДЕРЖАТЕЛЬНОМУ ходу, а не по разогреву', () => {
  // Сессия почти всегда начинается с чтения файла; мерить по нему значило бы мерить,
  // кто как разогревается, а не кто как ищет.
  const s = sessionSignals([rec(use('Read')), rec(use('Grep')), rec(bash('yarn tooling:overview'))]);
  assert.equal(s.firstActionWasSearch, true);
  const t = sessionSignals([rec(use('Read')), rec(bash('yarn tooling:overview')), rec(use('Grep'))]);
  assert.equal(t.firstActionWasSearch, false);
});

test('сессия без содержательных ходов — null, а не false', () => {
  // «Ходов не было» ≠ «начали не с поиска»: такая сессия в предикат не входит вовсе,
  // и false молча зачёл бы её как правильную.
  const s = sessionSignals([rec(use('Read')), rec(use('Edit'))]);
  assert.equal(s.firstActionWasSearch, null);
  assert.equal(s.hasWorkshopCall, false);
  assert.equal(s.calls, 2);
  assert.equal(s.other, 2);
});

test('счётчики и перечень инструментов сходятся', () => {
  const s = sessionSignals([rec(use('Grep'), bash('yarn scripts:sets-of x'), use('Read'))]);
  assert.equal(s.calls, 3);
  assert.equal(s.search + s.workshop + s.other, s.calls, 'ни один вызов не потерян и не удвоен');
  assert.deepEqual(s.tools, ['Bash', 'Grep', 'Read']);
  assert.equal(s.hasWorkshopCall, true);
});

test('битые строки транскрипта считаются, а не глотаются', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tool-use-'));
  const file = join(dir, 'sess.jsonl');
  writeFileSync(file, `${JSON.stringify(rec(use('Grep')))}\nне json\n${JSON.stringify(rec(bash('yarn x:y')))}\n`, 'utf8');
  const { records, broken } = readTranscript(file);
  assert.equal(records.length, 2);
  assert.equal(broken, 1, 'потери входа названы числом, а не подразумеваются');
});

test('обход каталога отдаёт сессии по времени и не падает на пустоте', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tool-use-'));
  writeFileSync(join(dir, 'a.jsonl'), `${JSON.stringify(rec(use('Grep')))}\n`, 'utf8');
  writeFileSync(join(dir, 'заметка.txt'), 'не транскрипт', 'utf8');
  const sessions = scanSessions(dir);
  assert.equal(sessions.length, 1, 'не-jsonl не считается сессией');
  assert.equal(sessions[0].sessionId, 'a');
  assert.equal(sessions[0].signals.search, 1);
  assert.deepEqual(scanSessions(join(dir, 'нет-такого')), [], 'нет каталога — пусто, не исключение');
});

test('живой транскрипт этой сессии разбирается — форма подтверждена на деле', () => {
  const dir = 'C:/Users/user190825/.claude/projects/c--Users-user190825-practice-Membrana-tooling';
  const sessions = scanSessions(dir);
  if (sessions.length === 0) return; // на чужой машине каталога может не быть — не красный
  const s = sessions.at(-1).signals;
  assert.ok(s.calls > 0, 'вызовы обязаны находиться');
  assert.ok(s.tools.includes('Bash'));
  assert.equal(s.search + s.workshop + s.other, s.calls);
});
