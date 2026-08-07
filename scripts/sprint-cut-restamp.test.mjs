/**
 * Зубы одноразового переноса дайджестов (`#plan-comment-keys-outside-digest`, 07.08).
 *
 * Главное охраняемое свойство — НЕ «перенёс всё», а «перенёс только годное»: миграция,
 * которая пересчитает дайджест плану с правленным после согласия телом, отмоет сломанное
 * согласие в годное. Это было бы хуже исходного дефекта, потому что молча.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { cutDigestOf, planRatified } from './lib/sprint-cut/index.mjs';
import { legacyBlockRevisionDigest, legacyCutDigestOf, restampBlocks, restampPlan } from './lib/sprint-cut/restamp.mjs';
import { parseRestampArgs } from './sprint-cut-restamp.mjs';

const fixture = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../docs/sprint/cut/fixtures/${name}`, import.meta.url)), 'utf8'));

/** План, ратифицированный по ПРЕЖНЕМУ правилу: несущее условие в `//`-ключе. */
const legacyRatified = () => {
  const body = {
    schema: 'cut/1',
    taskId: 'demo',
    '//dod': 'семь пунктов приёмки',
    blocks: [{ id: 'a1', performer: 'tarasov' }],
  };
  return { ...body, ratification: { by: 'owner', at: '2026-08-07T12:00:00+03:00', digest: legacyCutDigestOf(body) } };
};

// ─── перенос годного согласия ─────────────────────────────────────────────────

test('план, годный по прежнему правилу, переносится: тело, by и at не тронуты', () => {
  const before = legacyRatified();
  assert.equal(planRatified(before), false, 'до переноса новый предикат обязан видеть расхождение');

  const res = restampPlan(before);
  assert.equal(res.action, 'restamped');
  assert.equal(planRatified(res.plan), true, 'после переноса согласие снова годно');
  assert.equal(res.plan.ratification.by, before.ratification.by);
  assert.equal(res.plan.ratification.at, before.ratification.at);
  assert.equal(res.plan['//dod'], 'семь пунктов приёмки', 'тело не трогается ни в одном байте');
});

test('перенос идемпотентен: второй прогон уже ничего не делает', () => {
  const once = restampPlan(legacyRatified());
  const twice = restampPlan(once.plan);
  assert.equal(twice.action, 'skipped');
  assert.equal(twice.reason, 'дайджест уже по новому правилу');
  assert.deepEqual(twice.plan, once.plan);
});

test('после переноса подмена `//dod` снова сбрасывает ратификацию — зуб на месте, а не обойдён', () => {
  const { plan } = restampPlan(legacyRatified());
  assert.equal(planRatified({ ...plan, '//dod': 'ПОДМЕНЕНО' }), false);
});

// ─── границы: чего перенос делать НЕ вправе ───────────────────────────────────

test('тело, правленное после согласия, НЕ отмывается: отказ с названной причиной', () => {
  const plan = legacyRatified();
  plan['//dod'] = 'подменено уже после согласия';
  plan.blocks[0].performer = 'кто-то другой';

  const res = restampPlan(plan);
  assert.equal(res.action, 'skipped');
  assert.match(res.reason, /не сходится ни по старому/);
  assert.equal(planRatified(res.plan), false, 'план обязан остаться неретифицированным');
});

test('согласие без владельца и без ISO-времени не переносится', () => {
  const base = legacyRatified();
  assert.equal(restampPlan({ ...base, ratification: { ...base.ratification, by: 'tarasov' } }).action, 'skipped');
  assert.equal(restampPlan({ ...base, ratification: { ...base.ratification, at: '2026-08-07T12:00:00' } }).action, 'skipped');
  assert.equal(restampPlan({ ...base, ratification: undefined }).action, 'skipped');
});

test('фикстура «неретифицированный план» остаётся неретифицированной — исключений по имени файла нет', () => {
  const plan = fixture('plan.plan-unratified.json');
  const res = restampPlan(plan);
  assert.equal(res.action, 'skipped');
  assert.equal(planRatified(res.plan), false);
});

test('живые фикстуры после миграции дерева ратифицированы по новому правилу', () => {
  const plan = fixture('plan.valid.json');
  assert.equal(planRatified(plan), true);
  assert.equal(plan.ratification.digest, cutDigestOf(plan));
});

// ─── revisionOf: метка ревизии тоже идёт через canonicalJson ───────────────────

test('revisionOf перештамповывается, а revisionAt НЕ двигается: иначе ложный stale_trace', () => {
  // Блок собран так, как его оставила прежняя простановка: revisionOf по старому правилу.
  const block = { id: 'a1', performer: 'tarasov', '//why': 'причина' };
  const stamped = { ...block, revisionAt: '2026-08-01T10:00:00Z', revisionOf: legacyBlockRevisionDigest(block) };

  const res = restampBlocks([stamped]);
  assert.equal(res.restamped, 1);
  assert.equal(res.blocks[0].revisionAt, '2026-08-01T10:00:00Z', 'метка ревизии обязана остаться прежней');
  assert.notEqual(res.blocks[0].revisionOf, stamped.revisionOf);
});

test('блок, чей revisionOf разошёлся ДО миграции, не трогается — чужой вещдок не гасим', () => {
  const stamped = { id: 'a1', performer: 'tarasov', revisionAt: '2026-08-01T10:00:00Z', revisionOf: 'мусор' };
  const res = restampBlocks([stamped]);
  assert.equal(res.restamped, 0);
  assert.deepEqual(res.blocks[0], stamped);
});

// ─── разбор аргументов ────────────────────────────────────────────────────────

test('без флагов — сухой прогон по живому каталогу; --dir требует путь', () => {
  assert.deepEqual(parseRestampArgs([]), { execute: false, dir: 'docs/sprint/cut' });
  assert.deepEqual(parseRestampArgs(['--execute', '--dir', 'x/y']), { execute: true, dir: 'x/y' });
  assert.throws(() => parseRestampArgs(['--dir']), /--dir требует путь/);
  assert.throws(() => parseRestampArgs(['--wat']), /неизвестный аргумент/);
});
