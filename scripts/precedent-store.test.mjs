import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  countByClass,
  parsePrecedent,
  recurrenceRate,
  renderSnapshot,
  validatePrecedentMeta,
} from './lib/precedent-store.mjs';

const CLASSES = new Set(['cold-start', 'reporting-gap', 'session-report']);

function meta(over = {}) {
  return {
    id: '2026-07-22-x',
    date: '2026-07-22',
    class: 'cold-start',
    symptom: 'холодная сессия автостартовала',
    rootCause: 'старый скилл',
    fix: 'подводка утра',
    ...over,
  };
}

test('parsePrecedent: извлекает JSON из мета-блока', () => {
  const md = '# t\n<!-- precedent-meta\n{"id":"a","class":"cold-start"}\n-->\nпроза';
  const { meta: m, error } = parsePrecedent(md);
  assert.equal(error, null);
  assert.equal(m.id, 'a');
});

test('parsePrecedent: нет блока → ошибка', () => {
  assert.match(parsePrecedent('# t\nбез мета').error, /не найден/);
});

test('parsePrecedent: битый JSON → ошибка', () => {
  assert.match(parsePrecedent('<!-- precedent-meta\n{not json\n-->').error, /битый JSON/);
});

test('валидная мета → нет дефектов', () => {
  assert.deepEqual(validatePrecedentMeta(meta(), CLASSES, '2026-07-22-x'), []);
});

test('class вне enum → дефект', () => {
  const p = validatePrecedentMeta(meta({ class: 'выдуманный' }), CLASSES, '2026-07-22-x');
  assert.ok(p.some((x) => x.includes('вне закрытого перечня')));
});

test('нет обязательного поля (fix) → дефект', () => {
  const m = meta();
  delete m.fix;
  assert.ok(validatePrecedentMeta(m, CLASSES, '2026-07-22-x').some((x) => x.includes('нет поля fix')));
});

test('id ≠ имени файла → дефект', () => {
  assert.ok(validatePrecedentMeta(meta(), CLASSES, 'другое-имя').some((x) => x.includes('≠ имени файла')));
});

test('date не ISO → дефект', () => {
  assert.ok(validatePrecedentMeta(meta({ date: '22.07.2026' }), CLASSES, '2026-07-22-x').some((x) => x.includes('YYYY-MM-DD')));
});

test('лишнее поле → дефект', () => {
  assert.ok(validatePrecedentMeta(meta({ bogus: 1 }), CLASSES, '2026-07-22-x').some((x) => x.includes('лишнее поле bogus')));
});

test('actionItems: неверный status → дефект', () => {
  const m = meta({ actionItems: [{ text: 't', owner: 'ozhegov', status: 'maybe' }] });
  assert.ok(validatePrecedentMeta(m, CLASSES, '2026-07-22-x').some((x) => x.includes('status')));
});

test('actionItems: без owner → дефект', () => {
  const m = meta({ actionItems: [{ text: 't', status: 'open' }] });
  assert.ok(validatePrecedentMeta(m, CLASSES, '2026-07-22-x').some((x) => x.includes('owner')));
});

test('countByClass считает по классу', () => {
  const ps = [{ meta: meta() }, { meta: meta({ class: 'cold-start' }) }, { meta: meta({ class: 'reporting-gap' }) }];
  const c = countByClass(ps);
  assert.equal(c.get('cold-start'), 2);
  assert.equal(c.get('reporting-gap'), 1);
});

test('recurrenceRate: 3 записи, 2 класса → (3-2)/3', () => {
  const ps = [{ meta: meta() }, { meta: meta({ class: 'cold-start' }) }, { meta: meta({ class: 'reporting-gap' }) }];
  assert.ok(Math.abs(recurrenceRate(ps) - 1 / 3) < 1e-9);
});

test('recurrenceRate: пусто → 0', () => {
  assert.equal(recurrenceRate([]), 0);
});

test('renderSnapshot: помечает рецидив и содержит числа', () => {
  const ps = [
    { file: 'a.md', id: 'a', meta: meta({ id: 'a' }), problems: [] },
    { file: 'b.md', id: 'b', meta: meta({ id: 'b', class: 'cold-start' }), problems: [] },
  ];
  const snap = renderSnapshot(ps, { date: '2026-07-22', sha: 'abc' });
  assert.match(snap, /рецидив/);
  assert.match(snap, /Всего прецедентов: \*\*2\*\*/);
});
