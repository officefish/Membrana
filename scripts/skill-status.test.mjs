/**
 * Тесты статусной механики скиллов (M1-C заседания angelina-hostess). Чистые, без fs —
 * плюс один живой блок: реальные скиллы репо проходят гейт (иначе красный CI по DoD 4).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseSkillFrontMatter, freshSkill, skillGraphProblems,
  partitionPredicates, morningLeakProblems, MORNING_MARKERS,
} from './lib/skill-status.mjs';

test('parseSkillFrontMatter: name/status/supersededBy', () => {
  const fm = parseSkillFrontMatter('---\nname: x\nstatus: superseded\nsupersededBy: y\n---\n# тело');
  assert.deepEqual(fm, { name: 'x', status: 'superseded', supersededBy: 'y' });
  assert.deepEqual(parseSkillFrontMatter('# без фронт-маттера'), { name: null, status: null, supersededBy: null });
});

test('freshSkill: live без supersededBy — свеж; остальное — нет', () => {
  assert.equal(freshSkill({ status: 'live', supersededBy: null }), true);
  assert.equal(freshSkill({ status: 'deprecated' }), false);
  assert.equal(freshSkill({ status: 'superseded', supersededBy: 'x' }), false);
});

test('skillGraphProblems: здоровый граф — пусто', () => {
  assert.deepEqual(skillGraphProblems({
    a: { status: 'superseded', supersededBy: 'b' },
    b: { status: 'live' },
  }), []);
});

test('skillGraphProblems: ловит без-статуса, битую ссылку, не-live терминал, цикл', () => {
  assert.match(skillGraphProblems({ a: {} })[0], /статус отсутствует/u);
  assert.match(skillGraphProblems({ a: { status: 'superseded', supersededBy: 'ghost' } }).join(' '), /несуществующий/u);
  assert.match(skillGraphProblems({
    a: { status: 'superseded', supersededBy: 'b' },
    b: { status: 'deprecated' },
  }).join(' '), /не-live терминалом/u);
  assert.match(skillGraphProblems({
    a: { status: 'superseded', supersededBy: 'b' },
    b: { status: 'superseded', supersededBy: 'a' },
  }).join(' '), /цикл/u);
});

test('partitionPredicates: чистое разбиение — три предиката зелёные', () => {
  const r = partitionPredicates(['s1', 's2', 's3'], ['s1'], ['s2', 's3']);
  assert.deepEqual([r.covered, r.disjoint, r.noOrphans], [true, true, true]);
});

test('partitionPredicates: потеря, пересечение, сирота — ловятся', () => {
  assert.equal(partitionPredicates(['s1', 's2'], ['s1'], []).covered, false, 'потерян s2');
  assert.equal(partitionPredicates(['s1'], ['s1'], ['s1']).disjoint, false, 'двойной источник');
  assert.equal(partitionPredicates(['s1'], ['s1', 'ghost'], []).noOrphans, false, 'сирота');
});

test('живое разбиение утро/день: шаги старого скилла разнесены без потерь', () => {
  // S — шаги старого developer-rhythm (до вычеркивания); проверяем фактическое разбиение.
  const S = ['morning-care', 'plan-day', 'standup', 'main-day-issue', 'swallow-day',
    'archive-daily-day', 'code-review', 'save-review', 'team-feedback', 'audit', 'swallow-evening', 'persona-memory'];
  const morning = ['morning-care', 'plan-day', 'standup', 'main-day-issue', 'swallow-day'];
  const day = ['archive-daily-day', 'code-review', 'save-review', 'team-feedback', 'audit', 'swallow-evening', 'persona-memory'];
  const r = partitionPredicates(S, morning, day);
  assert.deepEqual(r.problems, []);
});

test('morningLeakProblems: live-скилл с утренним маркером ловится; morning-ritual — нет', () => {
  const skills = {
    'membrana-morning-ritual': { fm: { status: 'live' }, body: 'yarn ritual:day' },
    'membrana-developer-rhythm': { fm: { status: 'live' }, body: 'вечер: yarn ritual:evening; утро → morning-ritual' },
    'some-old': { fm: { status: 'live' }, body: 'шаг: yarn standup' },
    'dead-old': { fm: { status: 'deprecated' }, body: 'yarn plan:day' },
  };
  const problems = morningLeakProblems(skills);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /some-old/u);
});

test('ЖИВОЙ ГЕЙТ: реальные скиллы утра/ритма в репо — статусы валидны, утечек утра нет', () => {
  const root = join(process.cwd(), '.cursor', 'skills');
  const wanted = ['membrana-morning-ritual', 'membrana-developer-rhythm'];
  const skills = {};
  for (const name of wanted) {
    const p = join(root, name, 'SKILL.md');
    assert.ok(existsSync(p), `${name} существует`);
    const md = readFileSync(p, 'utf8');
    skills[name] = { fm: parseSkillFrontMatter(md), body: md };
  }
  assert.equal(skills['membrana-morning-ritual'].fm.status, 'live');
  assert.equal(skills['membrana-developer-rhythm'].fm.status, 'live');
  assert.deepEqual(skillGraphProblems(
    Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, v.fm])),
  ), []);
  assert.deepEqual(morningLeakProblems(skills), [], 'live-скиллы вне morning-ritual не несут утренних команд');
});
