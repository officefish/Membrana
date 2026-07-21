import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTaskEntry, insertTaskAtFront } from './lib/task-registry.mjs';
import { parseRegisterArgs } from './task-register.mjs';

test('parseRegisterArgs: обе формы флагов, --support список, --push булев', () => {
  const cli = parseRegisterArgs([
    '--id', 'my-task', '--title', 'Заголовок с пробелами',
    '--size=M', '--issue', '42', '--support', 'a, b ,c', '--push',
  ]);
  assert.equal(cli.id, 'my-task');
  assert.equal(cli.title, 'Заголовок с пробелами');
  assert.equal(cli.size, 'M');
  assert.equal(cli.issue, '42');
  assert.deepEqual(cli.support, ['a', 'b', 'c']);
  assert.equal(cli.push, true);
});

test('buildTaskEntry: нормализация + дефолтный promptPath + активный статус', () => {
  const e = buildTaskEntry(
    {
      id: 'my-task',
      title: '  T  ',
      size: 'M',
      issue: '42',
      linear: 'DRU-249',
      lead: 'vesnin',
      insight: 'ins-x',
    },
    '2026-07-14',
  );
  assert.equal(e.title, 'T');
  assert.equal(e.status, 'active');
  assert.equal(e.sprintKind, 'day-sprint');
  assert.equal(e.promptPath, 'docs/prompts/MY_TASK_PROMPT.md');
  assert.equal(e.githubIssue, 42);
  assert.equal(e.linearId, 'DRU-249');
  assert.equal(e.createdAt, '2026-07-14');
  assert.equal(e.insightId, 'ins-x');
  assert.equal(e.leadPersona, 'vesnin');
});

test('buildTaskEntry: без --linear → linearId null (поле всегда присутствует)', () => {
  const e = buildTaskEntry({ id: 'bare', title: 't', size: 'S' }, '2026-07-20');
  assert.equal(e.linearId, null);
});

test('buildTaskEntry: валидация id/size/kind/issue', () => {
  assert.throws(() => buildTaskEntry({ id: 'Bad_Id', title: 't', size: 'M' }, '2026-07-14'), /kebab-case/);
  assert.throws(() => buildTaskEntry({ id: 'x', title: 't', size: 'XL' }, '2026-07-14'), /size/);
  assert.throws(() => buildTaskEntry({ id: 'x', title: 't', size: 'M', kind: 'weird' }, '2026-07-14'), /kind/);
  assert.throws(() => buildTaskEntry({ id: 'x', title: 't', size: 'M', issue: 'abc' }, '2026-07-14'), /issue/);
  assert.throws(() => buildTaskEntry({ id: 'x', title: ' ', size: 'M' }, '2026-07-14'), /title/);
});

test('insertTaskAtFront: свежие сверху, вход не мутируется, дубль → ошибка', () => {
  const reg = { version: 1, tasks: [{ id: 'old' }] };
  const e = buildTaskEntry({ id: 'new-one', title: 't', size: 'S' }, '2026-07-14');
  const next = insertTaskAtFront(reg, e);
  assert.equal(next.tasks[0].id, 'new-one');
  assert.equal(next.tasks[1].id, 'old');
  assert.equal(reg.tasks.length, 1, 'вход не мутирован');
  assert.throws(() => insertTaskAtFront(next, e), /уже есть/);
});
