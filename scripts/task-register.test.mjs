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

// ── kind: meeting (01.08, карточка meeting-gates-teeth) ─────────────────────────────
// Регламент заседаний требует sprintKind: meeting и id вида meeting-<slug>, но
// инструмент такого значения не принимал: единственная карточка с ним в реестре
// заведена МИМО инструмента. Класс Db — «канон описывает тулинг, которого нет».

test('buildTaskEntry: kind meeting принимается — регламент заседаний его требует', () => {
  const entry = buildTaskEntry(
    { id: 'meeting-some-slug', title: 'Заседание', size: 'L', kind: 'meeting' },
    '2026-08-01',
  );
  assert.equal(entry.sprintKind, 'meeting');
});

test('buildTaskEntry: kind hackathon + parentHackathonId принимаются для route skill', () => {
  const entry = buildTaskEntry(
    {
      id: 'db-h5-checklist',
      title: 'DB-H5: test checklist',
      size: 'M',
      kind: 'hackathon',
      parentEpic: 'device-board-hackathon-1',
      parentHackathonId: 'device-board-hackathon-1',
    },
    '2026-08-01',
  );
  assert.equal(entry.sprintKind, 'hackathon');
  assert.equal(entry.parentEpic, 'device-board-hackathon-1');
  assert.equal(entry.parentHackathonId, 'device-board-hackathon-1');
});

test('buildTaskEntry: kind marathon обозначает долгую карточку, не построенную процедуру', () => {
  const entry = buildTaskEntry(
    { id: 'workflow-examples-marathon', title: 'Копить примеры workflow', size: 'L', kind: 'marathon' },
    '2026-08-01',
  );
  assert.equal(entry.sprintKind, 'marathon');
});

test('buildTaskEntry: перечень остаётся ЗАКРЫТЫМ — чужое значение по-прежнему падает', () => {
  assert.throws(
    () => buildTaskEntry({ id: 'x', title: 't', size: 'M', kind: 'meetings' }, '2026-08-01'),
    /kind/,
  );
  assert.throws(
    () => buildTaskEntry({ id: 'x', title: 't', size: 'M', kind: 'Meeting' }, '2026-08-01'),
    /kind/,
  );
});

test('buildTaskEntry: умолчание не поехало — без --kind по-прежнему day-sprint', () => {
  const entry = buildTaskEntry({ id: 'x', title: 't', size: 'M' }, '2026-08-01');
  assert.equal(entry.sprintKind, 'day-sprint');
});
