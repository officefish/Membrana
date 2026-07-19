/**
 * Тесты гейта свежести (узел F вердикта scripts-boundary M0, спринт
 * ritual-step-manifest-sf).
 *
 * Несущий инвариант: гейт КОНСЕРВАТИВЕН — при любой неопределённости (нет
 * провенанса, битая дата, упавший upstream) он говорит «не свеж». Инцидентом был
 * тихий проход протухшего, а не ложный стоп, поэтому асимметрия намеренная.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProvenance, dayOf, ageInDays, isFresh, explainStaleness, provenanceLine } from './lib/artifact-freshness.mjs';

const TODAY = '2026-07-18T21:40:00.000Z';
const REAL_HEADER = '<!-- Сгенерировано: 2026-07-17T15:00:15.021Z (yarn code-review; daily) -->\n\n> Контур ревью';

test('parseProvenance: реальный заголовок DAILY_CODE_REVIEW разбирается', () => {
  const p = parseProvenance(REAL_HEADER);
  assert.equal(p.generatedAt, '2026-07-17T15:00:15.021Z');
  assert.equal(p.tool, 'yarn code-review; daily');
  assert.equal(p.revision, null);
});

test('parseProvenance: ревизия достаётся из tool@sha', () => {
  const p = parseProvenance('<!-- Сгенерировано: 2026-07-18T03:00:00.000Z (yarn standup@0a122f2f) -->');
  assert.equal(p.revision, '0a122f2f');
});

test('parseProvenance: нет метки / битая дата → generatedAt null (не «свежий по умолчанию»)', () => {
  assert.equal(parseProvenance('# Просто заголовок').generatedAt, null);
  assert.equal(parseProvenance('<!-- Сгенерировано: не-дата (yarn x) -->').generatedAt, null);
  assert.equal(parseProvenance(null).generatedAt, null);
});

test('dayOf: сравниваем КАЛЕНДАРНЫЕ дни, не моменты', () => {
  assert.equal(dayOf('2026-07-18T03:07:09.070Z'), '2026-07-18');
  assert.equal(dayOf('2026-07-18T23:59:59.999Z'), '2026-07-18');
  assert.equal(dayOf('мусор'), null);
});

test('ageInDays: вчерашний = 1, сегодняшний = 0, завтрашний = -1', () => {
  assert.equal(ageInDays('2026-07-17T15:00:00.000Z', TODAY), 1);
  assert.equal(ageInDays('2026-07-18T03:00:00.000Z', TODAY), 0);
  assert.equal(ageInDays('2026-07-19T03:00:00.000Z', TODAY), -1);
});

test('isFresh: сегодняшний + upstream ok → свеж', () => {
  assert.equal(isFresh({ generatedAt: '2026-07-18T03:07:00.000Z' }, { today: TODAY, upstreamStatus: 'ok' }), true);
});

test('isFresh: вчерашний → НЕ свеж (сам инцидент)', () => {
  assert.equal(isFresh({ content: REAL_HEADER }, { today: TODAY, upstreamStatus: 'ok' }), false);
});

test('isFresh: upstream не ok → НЕ свеж даже при сегодняшней дате', () => {
  const artifact = { generatedAt: '2026-07-18T03:07:00.000Z' };
  assert.equal(isFresh(artifact, { today: TODAY, upstreamStatus: 'failed-critical' }), false);
  assert.equal(isFresh(artifact, { today: TODAY, upstreamStatus: 'skipped-noncritical' }), false);
});

test('isFresh: нет провенанса → НЕ свеж (консервативно)', () => {
  assert.equal(isFresh({ content: '# Без метки' }, { today: TODAY }), false);
  assert.equal(isFresh({}, { today: TODAY }), false);
});

test('isFresh: битый today → НЕ свеж (не падаем и не пропускаем)', () => {
  assert.equal(isFresh({ generatedAt: '2026-07-18T03:07:00.000Z' }, { today: 'мусор' }), false);
});

test('explainStaleness: свежий → null; протухший → ЧТО и НА СКОЛЬКО дней', () => {
  assert.equal(explainStaleness('X', { generatedAt: '2026-07-18T03:00:00.000Z' }, { today: TODAY }), null);

  const msg = explainStaleness('docs/DAILY_CODE_REVIEW.md', { content: REAL_HEADER }, { today: TODAY });
  assert.match(msg, /docs\/DAILY_CODE_REVIEW\.md/u);
  assert.match(msg, /устарел на 1 дн/u);
  assert.match(msg, /2026-07-17/u);
});

test('explainStaleness: упавший upstream объясняется отдельно от протухания', () => {
  const msg = explainStaleness('X', { generatedAt: '2026-07-18T03:00:00.000Z' }, { today: TODAY, upstreamStatus: 'failed-critical' });
  assert.match(msg, /шаг-источник не отработал/u);
});

test('explainStaleness: отсутствие провенанса названо честно', () => {
  assert.match(explainStaleness('X', { content: '# нет метки' }, { today: TODAY }), /нет провенанса/u);
});

test('provenanceLine: пишет дату и ревизию, читается обратно parseProvenance', () => {
  const line = provenanceLine({ tool: 'yarn code-review', now: TODAY, revision: 'abc1234' });
  const back = parseProvenance(line);
  assert.equal(back.generatedAt, TODAY);
  assert.equal(back.revision, 'abc1234');
});

test('maxAgeDays: свежесть — свойство РЕБРА, не артефакта', () => {
  const yesterday = { generatedAt: '2026-07-17T15:00:00.000Z' };

  // Вечернее ребро: архиватор читает ревью того же вечера — вчерашнее не годится.
  assert.equal(isFresh(yesterday, { today: TODAY, maxAgeDays: 0 }), false);

  // Утреннее ребро: планировщик читает ревью ПРОШЛОГО вечера — это норма, а не
  // протухание. Без этого послабления утренний ритуал вставал бы каждый день.
  assert.equal(isFresh(yesterday, { today: TODAY, maxAgeDays: 1 }), true);

  // Послабление не безгранично: позавчерашнее не проходит и по ребру maxAgeDays=1.
  assert.equal(isFresh({ generatedAt: '2026-07-16T15:00:00.000Z' }, { today: TODAY, maxAgeDays: 1 }), false);
});

test('maxAgeDays: дефолт строгий (0) — послабление объявляется явно', () => {
  const yesterday = { generatedAt: '2026-07-17T15:00:00.000Z' };
  assert.equal(isFresh(yesterday, { today: TODAY }), false, 'без объявления ребра — строго сегодня');
});

test('maxAgeDays: артефакт из будущего не свеж ни при каком послаблении', () => {
  const tomorrow = { generatedAt: '2026-07-19T10:00:00.000Z' };
  for (const maxAgeDays of [0, 1, 7, 30]) {
    assert.equal(isFresh(tomorrow, { today: TODAY, maxAgeDays }), false, `maxAgeDays=${maxAgeDays}`);
  }
});

test('explainStaleness: называет допуск ребра, а не только возраст', () => {
  const msg = explainStaleness('X', { generatedAt: '2026-07-16T10:00:00.000Z' }, { today: TODAY, maxAgeDays: 1 });
  assert.match(msg, /устарел на 2 дн/u);
  assert.match(msg, /допустимо до 1 дн/u);
});

test('ИНВАРИАНТ: перебор — гейт пропускает ТОЛЬКО (сегодня ∧ upstream ok)', () => {
  const days = ['2026-07-16T10:00:00.000Z', '2026-07-17T10:00:00.000Z', '2026-07-18T10:00:00.000Z', '2026-07-19T10:00:00.000Z', null];
  const statuses = ['ok', 'failed-critical', 'skipped-noncritical'];

  for (const generatedAt of days) {
    for (const upstreamStatus of statuses) {
      const expected = generatedAt !== null && dayOf(generatedAt) === dayOf(TODAY) && upstreamStatus === 'ok';
      assert.equal(
        isFresh({ generatedAt }, { today: TODAY, upstreamStatus }),
        expected,
        `generatedAt=${generatedAt} upstream=${upstreamStatus}`,
      );
    }
  }
});
