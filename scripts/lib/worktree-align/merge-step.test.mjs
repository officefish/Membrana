/**
 * Зубы исполнителя слияния (блок `merge-abort-guard`, спринт `worktrees-align`, #1738).
 *
 * ГЛАВНЫЙ ЗУБ ЗДЕСЬ — «дерево не осталось грязным». Всё остальное вторично: конфликт это
 * штатная находка, а брошенное полусмердженным чужое дерево — худшее, что умеет сделать
 * этот спринт. Поэтому проверяется не код возврата git, а ЗАМЕР состояния после отката:
 * git мог упасть, откатив, и мог смолчать, не откатив.
 *
 * Отдельно проверяется, что исполнитель не решает сам: род ff/merged называет ядро по
 * состоянию ДО слияния, а не исполнитель по виду вывода.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MERGE_RESULTS,
  formatAbortFailedNotice,
  isTerminal,
  makeMergeStep,
} from './merge-step.mjs';

const cleanState = (head) => ({ head, porcelainEmpty: true, unmergedPaths: [] });

/**
 * Фикстура git: `mergeFails` — merge бросает (конфликт); `states` — что вернёт readState
 * по порядку вызовов (при конфликте их два: на конфликте и после отката).
 */
function fakeIo({ heads = ['h0', 'h1'], mergeFails = false, states = [], abortThrows = false } = {}) {
  const calls = [];
  let headReads = 0;
  let stateReads = 0;
  return {
    calls,
    git(cwd, args) {
      calls.push(args.join(' '));
      if (args[0] === 'merge' && args[1] === '--abort') {
        if (abortThrows) throw new Error('abort упал');
        return '';
      }
      if (args[0] === 'merge') {
        if (mergeFails) throw new Error('CONFLICT');
        return '';
      }
      if (args[0] === 'rev-parse') {
        const v = heads[Math.min(headReads, heads.length - 1)];
        headReads += 1;
        return v;
      }
      return '';
    },
    readState() {
      const s = states[Math.min(stateReads, states.length - 1)];
      stateReads += 1;
      return s;
    },
  };
}

// ─── успешные исходы: род называет ядро ──────────────────────────────────────────

test('отставшее без своих коммитов — ядро называет исход ff', () => {
  const io = fakeIo({ heads: ['h0', 'h1'] });
  const r = makeMergeStep(io)('C:/w/x', { behind: 9, ahead: 0 });
  assert.equal(r.kind, MERGE_RESULTS.FF);
  assert.equal(r.headShaAfter, 'h1');
});

test('разошедшееся — merged, а не ff: исполнитель не гадает по выводу git', () => {
  const io = fakeIo({ heads: ['h0', 'h1'] });
  const r = makeMergeStep(io)('C:/w/x', { behind: 181, ahead: 7 });
  assert.equal(r.kind, MERGE_RESULTS.MERGED);
});

test('HEAD не сдвинулся — noop, а не выдуманный успех', () => {
  const io = fakeIo({ heads: ['h0', 'h0'] });
  const r = makeMergeStep(io)('C:/w/x', { behind: 0, ahead: 0 });
  assert.equal(r.kind, MERGE_RESULTS.NOOP);
});

// ─── конфликт: откат обязателен, список снимается ДО отката ──────────────────────

test('конфликт → merge --abort, дерево чисто → исход conflict', () => {
  const io = fakeIo({
    heads: ['h0'],
    mergeFails: true,
    states: [{ unmergedPaths: ['docs/tasks/registry.json'] }, cleanState('h0')],
  });
  const r = makeMergeStep(io)('C:/w/x', { behind: 5, ahead: 1 }, { parentSha: 'h0' });
  assert.equal(r.kind, MERGE_RESULTS.CONFLICT);
  assert.deepEqual(r.unmergedPaths, ['docs/tasks/registry.json']);
  assert.ok(io.calls.includes('merge --abort'), 'откат обязан быть вызван');
  assert.equal(isTerminal(r), false, 'конфликт — находка, а не терминальный класс');
});

test('список unmerged снимается ДО отката — после него его уже не спросишь', () => {
  const io = fakeIo({
    heads: ['h0'],
    mergeFails: true,
    states: [{ unmergedPaths: ['a.json', 'b.json'] }, cleanState('h0')],
  });
  const r = makeMergeStep(io)('C:/w/x', { behind: 5, ahead: 1 }, { parentSha: 'h0' });
  assert.deepEqual(r.unmergedPaths, ['a.json', 'b.json']);
});

// ─── провал отката: терминальный класс ───────────────────────────────────────────

test('откат не вернул дерево в чистое — abort_failed, а не «ошибка слияния»', () => {
  const io = fakeIo({
    heads: ['h0'],
    mergeFails: true,
    states: [
      { unmergedPaths: ['registry.json'] },
      { head: 'h9', porcelainEmpty: false, unmergedPaths: ['registry.json'], mergeHead: true },
    ],
  });
  const r = makeMergeStep(io)('C:/w/x', { behind: 5, ahead: 1 }, { parentSha: 'h0' });
  assert.equal(r.kind, MERGE_RESULTS.ABORT_FAILED);
  assert.equal(isTerminal(r), true, 'по этому дереву спринт обязан остановиться');
  assert.equal(r.parentShaExpected, 'h0');
  assert.match(r.residual.join(' '), /MERGE_HEAD/);
});

test('git смолчал, но не откатил — верим замеру, а не коду возврата', () => {
  const io = fakeIo({
    heads: ['h0'],
    mergeFails: true,
    abortThrows: false,
    states: [{ unmergedPaths: ['x'] }, { head: 'h0', porcelainEmpty: true, unmergedPaths: ['x'] }],
  });
  const r = makeMergeStep(io)('C:/w/x', { behind: 5, ahead: 1 }, { parentSha: 'h0' });
  assert.equal(r.kind, MERGE_RESULTS.ABORT_FAILED, 'unmerged остался — дерево не чисто');
});

test('git упал на самом abort, но дерево чисто — это НЕ терминальный класс', () => {
  const io = fakeIo({
    heads: ['h0'],
    mergeFails: true,
    abortThrows: true,
    states: [{ unmergedPaths: ['x'] }, cleanState('h0')],
  });
  const r = makeMergeStep(io)('C:/w/x', { behind: 5, ahead: 1 }, { parentSha: 'h0' });
  assert.equal(r.kind, MERGE_RESULTS.CONFLICT, 'откат упал, но состояние чистое — верим состоянию');
});

test('HEAD после отката ≠ parentSha квитанции — тоже abort_failed', () => {
  const io = fakeIo({
    heads: ['h0'],
    mergeFails: true,
    states: [{ unmergedPaths: ['x'] }, { head: 'ЧУЖОЙ', porcelainEmpty: true, unmergedPaths: [] }],
  });
  const r = makeMergeStep(io)('C:/w/x', { behind: 5, ahead: 1 }, { parentSha: 'h0' });
  assert.equal(r.kind, MERGE_RESULTS.ABORT_FAILED);
  assert.match(r.residual.join(' '), /HEAD ЧУЖОЙ ≠ ожидаемый h0/);
});

// ─── уведомление: без списка unmerged оно невалидно ──────────────────────────────

test('уведомление несёт путь, оба HEAD и список unmerged', () => {
  const notice = formatAbortFailedNotice({
    kind: MERGE_RESULTS.ABORT_FAILED,
    worktreeDir: 'C:/w/Membrana-codex',
    headShaAfter: 'h9',
    parentShaExpected: 'h0',
    unmergedPaths: ['docs/tasks/registry.json'],
    residual: ['MERGE_HEAD на месте'],
  });
  assert.equal(notice.valid, true);
  const text = notice.lines.join('\n');
  assert.match(text, /Membrana-codex/);
  assert.match(text, /ожидаемый HEAD: h0/);
  assert.match(text, /фактический HEAD: h9/);
  assert.match(text, /unmerged: docs\/tasks\/registry\.json/);
  assert.match(text, /повторов не будет/);
});

test('без списка unmerged уведомление объявляется невалидным, а не печатает бодрое «что-то пошло не так»', () => {
  const notice = formatAbortFailedNotice({
    kind: MERGE_RESULTS.ABORT_FAILED,
    worktreeDir: 'C:/w/x',
    unmergedPaths: [],
  });
  assert.equal(notice.valid, false);
  assert.match(notice.lines.join(' '), /невалидно/);
});

test('уведомление не применяется к нетерминальным исходам', () => {
  assert.equal(formatAbortFailedNotice({ kind: MERGE_RESULTS.CONFLICT }).valid, false);
});
