/**
 * Зубы проекции вещдока дня (b1 `ritual-reads-done-work`).
 *
 * Порча зуба 1 — тот же предикат `blockFreeOfStaleMark` применяется к сырому дампу той же
 * фикстуры и обязан дать false: если бы фикстура была «удобной», оба прошли бы, и зуб ничего
 * не доказывал бы. Прогон: `node --test scripts/lib/main-day-assertions-view.test.mjs`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertionsDocBlock,
  blockFreeOfStaleMark,
  parseAssertionsText,
  projectAssertions,
  renderAssertionsView,
} from './main-day-assertions-view.mjs';
import { FRESHNESS, magistralFreshness } from './main-day-magistral-freshness.mjs';

const TODAY = '2026-09-29';

/** Живой случай 29.09 в миниатюре: `//date` застрял на 24.09, sources[0] и гейт — сегодня. */
function fixture() {
  return {
    '//': 'Посылки развилки MAIN_DAY_ISSUE — вход гейта yarn main-day-probe.',
    '//date': 'Перечеканено 24.09 под cabinet-registration-rollout, второй день …',
    assertions: [],
    sources: [
      { claim: 'Владелец 29.09: магистраль — three-roads-experiment (ответ «первое»).', origin: 'owner-choice@chat/magistral-29-09', date: '2026-09-29', author: 'human', mintedBy: 'agent' },
      { claim: 'Владелец 23.09: магистраль — cabinet-registration-rollout.', origin: 'owner-choice@chat/magistral-23-09', date: '2026-09-23', author: 'human' },
    ],
    '//retired-rollout-magistral-24-09': 'ОТСЛУЖИЛА 28.09: посылка выбора владельца 24.09 (cabinet-registration-rollout) … ' + 'x'.repeat(40_000),
    '//retired-pagination-magistral-28-09': 'ОТСЛУЖИЛА 29.09: … ' + 'y'.repeat(30_000),
    '//recut-29-09': 'Перечеканено 29.09 под three-roads-experiment — ответ владельца «первое».',
    archivedFork: { date: '2026-07-16', assertions: [], sources: [] },
  };
}
const GATE_TODAY = { magistral: 'three-roads-experiment', day: TODAY };

test('живой случай 29.09: проекция несёт aligned и НЕ несёт застрявшую метку //date', () => {
  const { block, ok, freshness } = assertionsDocBlock({ text: JSON.stringify(fixture()), gate: GATE_TODAY, today: TODAY, label: 'МАГИСТРАЛЬ' });
  assert.equal(ok, true);
  assert.equal(freshness.verdict, FRESHNESS.ALIGNED);
  assert.match(block, /свежесть посылок: aligned/u);
  assert.match(block, /three-roads-experiment \(ответ «первое»\)/u);
  assert.equal(blockFreeOfStaleMark(block), true);
});

test('ПОРЧА: сырой дамп той же фикстуры несёт метку — тот же предикат даёт false', () => {
  const raw = JSON.stringify(fixture(), null, 2);
  assert.equal(blockFreeOfStaleMark(raw), false, 'фикстура обязана содержать порчу, иначе зуб 1 пуст');
  // И — что важнее — сырой дамп, обрезанный окном генератора, теряет //recut-29-09, а метку 24.09 оставляет.
  const window = raw.slice(0, 22_000);
  assert.match(window, /Перечеканено 24\.09/u);
  assert.doesNotMatch(window, /recut-29-09/u);
});

test('один предикат свежести: проекция отдаёт ровно то, что вернул magistralFreshness', () => {
  const doc = fixture();
  const view = projectAssertions(doc, GATE_TODAY, TODAY);
  assert.deepEqual(view.freshness, magistralFreshness(doc, GATE_TODAY, TODAY));
});

test('гейт свежее источника → gate_newer печатается словами, а не выводится моделью', () => {
  const doc = fixture();
  doc.sources[0].date = '2026-09-28';
  const { block, freshness } = assertionsDocBlock({ text: JSON.stringify(doc), gate: GATE_TODAY, today: TODAY, label: 'М' });
  assert.equal(freshness.verdict, FRESHNESS.GATE_NEWER);
  assert.match(block, /свежесть посылок: gate_newer/u);
  assert.match(block, /перечеканка НЕ сделана/u);
});

test('архив и комментарии — счётом, содержимое не подаётся; проекция помещается в окно генератора', () => {
  const doc = fixture();
  const block = renderAssertionsView(projectAssertions(doc, GATE_TODAY, TODAY));
  assert.doesNotMatch(block, /ОТСЛУЖИЛА/u);
  assert.doesNotMatch(block, /xxxxxxxx/u);
  assert.match(block, /комментариев `\/\/…` 5, из них отслуживших `\/\/retired-\*` 2, archivedFork: есть/u);
  assert.ok(block.length < 22_000, `проекция ${block.length} знаков — обязана влезать в окно 22 000 целиком`);
  assert.ok(JSON.stringify(doc).length > 22_000, 'фикстура обязана превышать окно, иначе зуб про обрезку пуст');
});

test('прежние источники — только даты и origin, без claim', () => {
  const block = renderAssertionsView(projectAssertions(fixture(), GATE_TODAY, TODAY));
  assert.match(block, /Прежние источники — 1/u);
  assert.match(block, /2026-09-23 · owner-choice@chat\/magistral-23-09 · author=human/u);
  assert.doesNotMatch(block, /Владелец 23\.09: магистраль/u);
});

test('посылки подаются дословно — это предмет probe', () => {
  const doc = fixture();
  doc.assertions = [{ id: 'a1', claim: 'работы нет', marker: { kind: 'file', value: 'x.md' } }];
  const block = renderAssertionsView(projectAssertions(doc, GATE_TODAY, TODAY));
  assert.match(block, /Посылки `assertions\[\]` — 1/u);
  assert.match(block, /"claim": "работы нет"/u);
});

test('источников нет → сказано словами, свежесть no_sources', () => {
  const doc = fixture();
  doc.sources = [];
  const view = projectAssertions(doc, GATE_TODAY, TODAY);
  assert.equal(view.freshness.verdict, FRESHNESS.NO_SOURCES);
  assert.match(renderAssertionsView(view), /магистраль владельцем не задана/u);
});

test('испорченный вход: отказ с причиной, сырой текст в промпт НЕ подаётся', () => {
  for (const [text, why] of [
    ['{ "sources": [ …', /не разбирается как JSON/u],
    ['[1,2,3]', /корень документа не объект/u],
    ['', /пуст или отсутствует/u],
    [null, /пуст или отсутствует/u],
  ]) {
    const { ok, block } = assertionsDocBlock({ text, gate: GATE_TODAY, today: TODAY, label: 'М' });
    assert.equal(ok, false);
    assert.match(block, why);
    assert.match(block, /сырой текст в промпт не подаётся/u);
    assert.doesNotMatch(block, /1,2,3/u);
  }
  assert.equal(parseAssertionsText('{"a":1}').ok, true);
});
