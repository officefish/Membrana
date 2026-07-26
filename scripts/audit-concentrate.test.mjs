/**
 * Тесты ядра сверки источников правды (спринт audit-concentrate-v1, #1238).
 *
 * Предмет: категоризация (противоречие · без подтверждения · подтверждено), независимость
 * источников (производный снимок не удваивает голос своего источника), детерминированность
 * рендера и честный empty-state. Файловой системы и даты в тестах нет — ядро чистое.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  byVerdict,
  independenceKey,
  normalizeFact,
  reconcile,
  renderConcentrate,
} from './lib/audit-concentrate.mjs';

const fact = (over) => ({ subject: 's', claim: 'сделано', source: 'git', ...over });

test('нормализация: пустое утверждение — не факт (иначе в сверку течёт заглушка)', () => {
  assert.equal(normalizeFact(fact()).ok, true);
  assert.equal(normalizeFact(fact({ claim: '   ' })).ok, false);
  assert.equal(normalizeFact(fact({ subject: '' })).ok, false);
  assert.equal(normalizeFact(fact({ source: '' })).ok, false);

  const bad = normalizeFact({ subject: 'комната', claim: '', source: 'git' });
  assert.ok(!bad.ok && bad.problem.includes('пустое утверждение'));
});

test('противоречие: два разных утверждения об одном субъекте', () => {
  const { subjects } = reconcile([
    { subject: 'состояние комнаты', claim: 'закрыта', source: 'worktree', evidence: 'state.json в дереве' },
    { subject: 'состояние комнаты', claim: 'открыта', source: 'main', evidence: 'state.json в общей ветке' },
  ]);
  assert.equal(subjects.length, 1);
  assert.equal(subjects[0].verdict, 'conflict');
  assert.deepEqual(
    subjects[0].claims.map((c) => c.claim),
    ['закрыта', 'открыта'].sort((a, b) => a.localeCompare(b)),
    'обе версии сохранены — разбирать будет человек',
  );
});

test('подтверждение требует ДВУХ независимых голосов', () => {
  const one = reconcile([{ subject: 'карточка', claim: 'закрыта', source: 'tasks-registry' }]);
  assert.equal(one.subjects[0].verdict, 'unbacked', 'один источник — не подтверждение');

  const two = reconcile([
    { subject: 'карточка', claim: 'закрыта', source: 'tasks-registry' },
    { subject: 'карточка', claim: 'закрыта', source: 'github' },
  ]);
  assert.equal(two.subjects[0].verdict, 'confirmed');
  assert.equal(two.subjects[0].voices, 2);
});

test('производный снимок не удваивает голос своего источника', () => {
  assert.equal(independenceKey('tasks-registry'), independenceKey('tasks-readme'));
  assert.notEqual(independenceKey('tasks-registry'), independenceKey('git'));

  const derived = reconcile([
    { subject: 'карточка', claim: 'активна', source: 'tasks-registry' },
    { subject: 'карточка', claim: 'активна', source: 'tasks-readme' },
  ]);
  assert.equal(derived.subjects[0].voices, 1, 'реестр и его проекция — один голос');
  assert.equal(derived.subjects[0].verdict, 'unbacked', 'самоподтверждение не считается');
});

test('раскладка по разделам: конфликты первыми', () => {
  const { subjects } = reconcile([
    { subject: 'a', claim: 'x', source: 'git' },
    { subject: 'b', claim: 'x', source: 'git' },
    { subject: 'b', claim: 'y', source: 'session' },
    { subject: 'c', claim: 'z', source: 'git' },
    { subject: 'c', claim: 'z', source: 'session' },
  ]);
  const g = byVerdict(subjects);
  assert.deepEqual(g.conflict.map((s) => s.subject), ['b']);
  assert.deepEqual(g.unbacked.map((s) => s.subject), ['a']);
  assert.deepEqual(g.confirmed.map((s) => s.subject), ['c']);
});

test('рендер детерминирован и сворачивает подтверждённое в строку', () => {
  const { subjects } = reconcile([
    { subject: 'вечерний ритуал 24.07', claim: 'проведён', source: 'session' },
    { subject: 'артефакты вечера 24.07', claim: 'в общей ветке', source: 'main' },
    { subject: 'артефакты вечера 24.07', claim: 'отсутствуют в общей ветке', source: 'git' },
  ]);
  const a = renderConcentrate({ day: '2026-07-25', subjects });
  const b = renderConcentrate({ day: '2026-07-25', subjects });
  assert.equal(a, b, 'одинаковые снимки → одинаковый отчёт');
  assert.ok(a.includes('## Противоречия'));
  assert.ok(a.includes('вечерний ритуал 24.07'), 'единственный голос попал в «без подтверждения»');
  assert.ok(/Подтверждённых фактов нет|подтверждены двумя/.test(a));
});

test('недоступный источник назван вслух, а не проглочен', () => {
  const out = renderConcentrate({
    day: '2026-07-26',
    subjects: [],
    unavailable: [{ source: 'github', why: 'сеть недоступна' }],
  });
  assert.ok(out.includes('Сверка неполна'));
  assert.ok(out.includes('github — сеть недоступна'));
  assert.ok(out.includes('_Противоречий не найдено._'), 'пустой раздел честно помечен');
});

test('брак входа виден отдельным разделом, а не молча отбрасывается', () => {
  const { subjects, problems } = reconcile([
    { subject: 'a', claim: 'x', source: 'git' },
    { subject: 'b', claim: '', source: 'git' },
  ]);
  assert.equal(problems.length, 1);
  const out = renderConcentrate({ day: '2026-07-26', subjects, problems });
  assert.ok(out.includes('## Брак входа'));
});
