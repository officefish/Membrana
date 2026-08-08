import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BLOCK_REASONS,
  BRANCH_STATUS_LIMITS,
  branchStatus,
  formatBranchStatus,
} from './lib/branch-status.mjs';

// Зубы контракта «безопасно ли двигать ветку» (блок B, #1759). Ядро чистое: снимок
// приходит значением, git и gh не нужны.

const snap = (over = {}) => ({
  branch: 'sprint/demo',
  pullRequests: [],
  unpushed: [],
  unmergedContent: [],
  ...over,
});

test('чистая ветка — safe, и это УТВЕРЖДЕНИЕ, а не молчание', () => {
  const v = branchStatus(snap());
  assert.equal(v.safe, true);
  assert.deepEqual(v.reasons, []);
  const text = formatBranchStatus(v).join('\n');
  assert.match(text, /safe · двигать голову можно/u);
  assert.match(text, /проверено:/u, 'сказано ЧТО проверено — иначе «safe» неотличим от «не смотрел»');
});

test('живой PR — отказ ДО действия, номер назван', () => {
  const v = branchStatus(snap({ pullRequests: [{ number: 1759, state: 'OPEN' }] }));
  assert.equal(v.safe, false);
  assert.deepEqual(v.reasons.map((r) => r.kind), ['open-pr']);
  assert.match(v.reasons[0].detail, /#1759/u);
});

test('закрытый и влитый PR движению не мешают — судится только живой', () => {
  const v = branchStatus(snap({ pullRequests: [{ number: 1, state: 'MERGED' }, { number: 2, state: 'CLOSED' }] }));
  assert.equal(v.safe, true);
});

test('незапушенные коммиты — отказ: перецеливание потеряло бы их молча', () => {
  const v = branchStatus(snap({ unpushed: ['a'.repeat(40), 'b'.repeat(40)] }));
  assert.deepEqual(v.reasons.map((r) => r.kind), ['unpushed-commits']);
  assert.match(v.reasons[0].detail, /2 шт\./u);
});

test('содержание не в стволе — отказ; сравнение по patch-id названо в тексте (#492)', () => {
  const v = branchStatus(snap({ unmergedContent: ['c'.repeat(40)] }));
  assert.deepEqual(v.reasons.map((r) => r.kind), ['unmerged-content']);
  assert.match(v.reasons[0].detail, /patch-id, не по предкам/u);
});

test('НЕСКОЛЬКО причин разом называются ВСЕ — одна причина была бы ложью по опущению', () => {
  const v = branchStatus(snap({
    pullRequests: [{ number: 7, state: 'OPEN' }],
    unpushed: ['d'.repeat(40)],
    unmergedContent: ['e'.repeat(40)],
  }));
  assert.equal(v.safe, false);
  assert.deepEqual(v.reasons.map((r) => r.kind), ['open-pr', 'unpushed-commits', 'unmerged-content']);
  const text = formatBranchStatus(v).join('\n');
  assert.match(text, /blocked: open-pr, unpushed-commits, unmerged-content/u);
});

test('порядок причин — от самой дорогой ошибки к самой дешёвой', () => {
  const v = branchStatus(snap({
    unmergedContent: ['f'.repeat(40)],
    unpushed: ['g'.repeat(40)],
    pullRequests: [{ number: 9, state: 'OPEN' }],
  }));
  assert.deepEqual(
    v.reasons.map((r) => r.kind),
    ['open-pr', 'unpushed-commits', 'unmerged-content'],
    'сдвинуть ветку под живым PR хуже, чем потерять локальный коммит',
  );
});

test('пустое имя ветки — бросок: судить нечего', () => {
  assert.throws(() => branchStatus({ branch: '' }), /имя ветки пусто/u);
  assert.throws(() => branchStatus({}), /имя ветки пусто/u);
});

test('список причин закрыт, пределы глагола объявлены вслух', () => {
  assert.deepEqual([...BLOCK_REASONS], ['open-pr', 'unpushed-commits', 'unmerged-content']);
  assert.ok(BRANCH_STATUS_LIMITS.length >= 4);
  assert.ok(
    BRANCH_STATUS_LIMITS.some((l) => /ложно-положительным/u.test(l)),
    'слабость unmerged-content при merge-коммитах признана, а не скрыта',
  );
  assert.ok(BRANCH_STATUS_LIMITS.some((l) => /удаления|удаление/u.test(l)));
});
