/**
 * Зуб контейнера кейсов (#1298): закрытые перечни, легальное «нет», резолв вещдоков,
 * агрегаты — оба пути, не только счастливый.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isLegalNo,
  nominations,
  parseCase,
  portfolio,
  renderNominations,
  renderSnapshot,
  validateCaseMeta,
} from './case-store.mjs';

const MECHS = new Set(['guard-over-yes', 'task-reframing']);
const EVID = new Set(['ozon-receipt-3765-field-kit']);

const GOOD = {
  id: '2026-07-26-guard-case',
  date: '2026-07-26',
  home: 'bridge',
  span: { none: 'архив не отдаёт адресуемый отрезок (#1229)' },
  actors: ['капитан', 'агент'],
  evidence: ['ozon-receipt-3765-field-kit'],
  mechanism: 'guard-over-yes',
  repeatable: 'repeatable',
  cost: { metric: 'passes', value: 1 },
  proofs: { count: 1, kinds: ['protocol'] },
  firmness: { none: 'шкала не размечалась' },
  links: ['issue:#1298'],
};

test('полный подвал с легальными «нет» → ноль находок', () => {
  const p = validateCaseMeta(GOOD, { mechanismKeys: MECHS, evidenceIds: EVID, fileBase: '2026-07-26-guard-case' });
  assert.deepEqual(p, []);
});

test('свободный текст в mechanism → находка про закрытый перечень (зверь «Проза»)', () => {
  const p = validateCaseMeta({ ...GOOD, mechanism: 'агент молодец, всё получилось' }, { mechanismKeys: MECHS, evidenceIds: EVID });
  assert.ok(p.some((x) => x.includes('mechanism') && x.includes('Проза')));
});

test('«нет» без причины → находка (заглушка не пролезает под легальное «нет»)', () => {
  const p = validateCaseMeta({ ...GOOD, cost: { none: '' } }, { mechanismKeys: MECHS, evidenceIds: EVID });
  assert.ok(p.some((x) => x.includes('cost') && x.includes('без причины')));
  assert.ok(!isLegalNo({ none: '' }));
  assert.ok(isLegalNo({ none: 'не измерялась' }));
});

test('битая ссылка на вещдок → находка ПО ИМЕНИ id', () => {
  const p = validateCaseMeta({ ...GOOD, evidence: ['no-such-evidence'] }, { mechanismKeys: MECHS, evidenceIds: EVID });
  assert.ok(p.some((x) => x.includes('no-such-evidence') && x.includes('битая ссылка')));
});

test('id: легального «нет» не бывает; id ≠ имени файла — находка', () => {
  const p = validateCaseMeta(GOOD, { mechanismKeys: MECHS, evidenceIds: EVID, fileBase: 'другое-имя' });
  assert.ok(p.some((x) => x.includes('≠ имени файла')));
});

test('пропущенное обязательное поле называется вместе с формой легального «нет»', () => {
  const { firmness, ...rest } = GOOD;
  const p = validateCaseMeta(rest, { mechanismKeys: MECHS, evidenceIds: EVID });
  assert.ok(p.some((x) => x.includes('нет поля firmness') && x.includes('none')));
});

test('parseCase: без мета-блока и с битым JSON — честные ошибки', () => {
  assert.match(parseCase('# просто проза').error, /не найден/u);
  assert.match(parseCase('<!-- case-meta {кривой json} -->').error, /битый JSON/u);
});

test('portfolio: механизмы считаются, везение и недостача доказательств названы по id', () => {
  const cases = [
    { id: 'a', meta: GOOD, problems: [] },
    { id: 'b', meta: { ...GOOD, id: 'b', repeatable: 'one-off-luck', proofs: { count: 0, kinds: [] } }, problems: [] },
  ];
  const { byMechanism, luck, proofGaps } = portfolio(cases);
  assert.equal(byMechanism.get('guard-over-yes').total, 2);
  assert.equal(byMechanism.get('guard-over-yes').repeatable, 1);
  assert.deepEqual(luck, ['b']);
  assert.deepEqual(proofGaps, ['b']);
});

test('nominations: повторяемый с живыми вещдоками готов; без вещдоков — честно ждёт', () => {
  const noEvid = { ...GOOD, id: 'c', evidence: { none: 'изъятие ждёт архивариуса (#1229)' } };
  const { ready, waiting } = nominations([
    { id: 'a', meta: GOOD, problems: [] },
    { id: 'c', meta: noEvid, problems: [] },
    { id: 'd', meta: { ...GOOD, id: 'd', repeatable: 'conditional' }, problems: [] },
  ]);
  assert.deepEqual(ready.map((n) => n.id), ['a']);
  assert.deepEqual(waiting.map((n) => n.id), ['c']);
  assert.match(waiting[0].why, /1229/u);
});

test('снимки: реестр несёт подвал-статус, номинации подчёркивают «только номинация»', () => {
  const cases = [{ id: 'a', meta: GOOD, problems: [] }];
  assert.match(renderSnapshot(cases, { date: '2026-07-27' }), /\| a \|.*полон \|/u);
  const nom = renderNominations(nominations(cases), { date: '2026-07-27' });
  assert.match(nom, /Только номинация/u);
  assert.match(nom, /guard-over-yes/u);
});
