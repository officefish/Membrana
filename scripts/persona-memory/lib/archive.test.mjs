/**
 * Зубы P0+P1 контура памяти (C1 DoD п.1,5,6; C6 DoD п.1): схема, инварианты,
 * монотонность, отсутствие erase. Фикстура-вещдок C1 DoD п.6 — здесь.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import * as appendMod from './archive-append.mjs';
import { appendArchive, readArchive } from './archive-append.mjs';
import {
  appendMonotonic, fullRefProblems, HOMES, parseArchive, recordProblems, V2_SLOTS,
} from './archive-schema.mjs';

// Фикстура-вещдок (C1 DoD п.6): verbatim + summary с fullRef + снимок важности.
const VERBATIM = {
  id: 'dynin-2026-07-23-tasks-workshop-m2-set',
  personaId: 'dynin',
  ts: '2026-07-23T10:00:00Z',
  provenance: 'docs/seanses/tasks-workshop-m2-set-2026-07-23.md#reply-1',
  source: 'консилиум tasks-workshop',
  kind: 'verbatim',
  text: 'Предикат множества карточек фиксирую как…',
  importanceSnapshot: 'pinned',
};
const SUMMARY = {
  id: 'dynin-2026-07-05-insight-comms-topology',
  personaId: 'dynin',
  ts: '2026-07-05T12:00:00Z',
  provenance: 'docs/insights/comms-contour-topology.md',
  source: 'insight-review',
  kind: 'summary',
  text: 'Сжатие: топология контура связи — leaf-изоляция по записи.',
  fullRef: 'docs/insights/comms-contour-topology.md',
  importanceSnapshot: 'normal',
};

test('схема: valid-записи проходят, summary без fullRef — красный (C1)', () => {
  assert.deepEqual(recordProblems(VERBATIM), []);
  assert.deepEqual(recordProblems(SUMMARY), []);
  const bad = { ...SUMMARY };
  delete bad.fullRef;
  assert.ok(recordProblems(bad).some((p) => p.includes('fullRef')), 'конспект без указателя не существует');
  assert.ok(recordProblems({ ...VERBATIM, kind: 'oral' }).length > 0, 'kind вне закрытого перечня');
  assert.ok(recordProblems({ ...VERBATIM, ts: 'вчера' }).some((p) => p.includes('метки времени')));
});

test('parseArchive: дубль id и битые строки — problems поимённо, не exception', () => {
  const text = [JSON.stringify(VERBATIM), '{битая', JSON.stringify(VERBATIM)].join('\n');
  const { records, problems } = parseArchive(text);
  assert.equal(records.length, 1);
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes('дубль id')));
});

test('appendMonotonic: дописывание — да, переписывание истории — нет', () => {
  const oldText = JSON.stringify(VERBATIM) + '\n';
  assert.equal(appendMonotonic(oldText, oldText + JSON.stringify(SUMMARY) + '\n'), true);
  assert.equal(appendMonotonic(oldText, JSON.stringify(SUMMARY) + '\n'), false, 'история переписана — красный');
});

test('fullRefProblems: нерезолв конспекта виден поимённо', () => {
  const problems = fullRefProblems([SUMMARY], () => false);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes(SUMMARY.id));
  assert.deepEqual(fullRefProblems([SUMMARY], () => true), []);
});

test('оператора erase НЕ СУЩЕСТВУЕТ: экспорты append-модуля без delete/erase/truncate (C1)', () => {
  const names = Object.keys(appendMod);
  for (const n of names) {
    assert.ok(!/delete|erase|remove|truncate|rewrite/iu.test(n), `экспорт «${n}» пахнет удалением`);
  }
  assert.ok(names.includes('appendArchive') && names.includes('readArchive'));
});

test('appendArchive: живой цикл — append, отказ дубля, монотонность файла', () => {
  const root = mkdtempSync(join(tmpdir(), 'memory-archive-'));
  const r1 = appendArchive(root, VERBATIM);
  assert.equal(r1.ok, true);
  const afterOne = readFileSync(join(root, HOMES.archive('dynin')), 'utf8');

  const dup = appendArchive(root, VERBATIM);
  assert.equal(dup.ok, false);
  assert.ok(dup.problems[0].includes('дубль'));

  const r2 = appendArchive(root, SUMMARY);
  assert.equal(r2.ok, true);
  const afterTwo = readFileSync(join(root, HOMES.archive('dynin')), 'utf8');
  assert.equal(appendMonotonic(afterOne, afterTwo), true, 'append не тронул префикс');

  const { records, exists } = readArchive(root, 'dynin');
  assert.equal(exists, true);
  assert.deepEqual(records.map((r) => r.id), [VERBATIM.id, SUMMARY.id]);
  assert.equal(readArchive(root, 'ozhegov').exists, false, 'нет файла — честная пустота');
});

test('невалидная запись не пишется — отказ громкий, не тихий пропуск', () => {
  const root = mkdtempSync(join(tmpdir(), 'memory-archive-'));
  const bad = { ...SUMMARY, id: 'bad-no-fullref' };
  delete bad.fullRef;
  const r = appendArchive(root, bad);
  assert.equal(r.ok, false);
  assert.equal(readArchive(root, 'dynin').exists, false, 'файл не создан под мусор');
});

test('v2-слоты именованы и остаются именами (не полями схемы v1)', () => {
  assert.ok(V2_SLOTS.includes('summarizer') && V2_SLOTS.includes('supersededBy'));
  assert.deepEqual(recordProblems({ ...VERBATIM }), [], 'v1-запись не требует v2-полей');
});
