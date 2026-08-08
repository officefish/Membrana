/**
 * Зубы извлечения и классификации атомов (блок b1, карточка feedback-claims-code-probe #1795).
 *
 * Корпус граничных случаев назван исполнителем блока при прогоне контекста
 * (docs/discussions/block-b1-claims-core-dynin.md) и держит главный риск спринта: адрес.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ATOM_CLASSES,
  claimLines,
  classifyToken,
  dedupeAtoms,
  extractAtoms,
  isHedged,
  mentionsClientSide,
} from './atoms.mjs';

test('fenced-код не даёт атомов: токен внутри уже является кодом, а не утверждением о нём', () => {
  const md = [
    'Роль говорит про `realSymbol`.',
    '',
    '```',
    '$ grep -rn "fakeSymbol" packages/',
    '…/some.ts:74:  async fakeSymbol(input: {',
    '```',
    '',
    'И ещё про `secondSymbol`.',
  ].join('\n');
  const tokens = extractAtoms(md).map((a) => a.token);
  assert.deepEqual(tokens, ['realSymbol', 'secondSymbol']);
});

test('таблица и цитата не дают атомов: сводка и чужой голос — не утверждения протокола', () => {
  const md = [
    '| Роль | Балл |',
    '|------|------|',
    '| Teamlead | `tableToken` |',
    '',
    '> Регламент требует `quotedToken`.',
    '',
    'Тело несёт `bodyToken`.',
  ].join('\n');
  assert.deepEqual(extractAtoms(md).map((a) => a.token), ['bodyToken']);
});

test('HTML-комментарий провенанса не даёт атомов', () => {
  const md = '<!-- Сгенерировано: 2026-08-07 (yarn team-evening-feedback; `hiddenToken`) -->\nТело: `shownToken`.';
  assert.deepEqual(extractAtoms(md).map((a) => a.token), ['shownToken']);
});

test('frontmatter съедается только в начале файла — `---` в теле остаётся горизонтальной чертой', () => {
  const md = ['---', 'name: x', '---', 'До черты `beforeRule`.', '', '---', '', 'После черты `afterRule`.'].join('\n');
  const tokens = extractAtoms(md).map((a) => a.token);
  assert.deepEqual(tokens, ['beforeRule', 'afterRule']);
});

test('claimLines возвращает номера строк исходного файла — вердикт указывает на место', () => {
  const md = ['первая', '', '```', 'код', '```', '', 'седьмая'].join('\n');
  assert.deepEqual(claimLines(md).map((l) => l.line), [1, 7]);
});

test('классы: PR, глагол, путь, документ, карточка, символ', () => {
  assert.deepEqual(classifyToken('#1776'), [ATOM_CLASSES.PR]);
  assert.deepEqual(classifyToken('yarn code-review:pr 1765'), [ATOM_CLASSES.VERB]);
  assert.deepEqual(classifyToken('scripts/lib/evening-gates.mjs'), [ATOM_CLASSES.PATH]);
  assert.deepEqual(classifyToken('ritual-deliver-to-main.mjs'), [ATOM_CLASSES.PATH, ATOM_CLASSES.DOC]);
  assert.deepEqual(classifyToken('MAIN_DAY_ISSUE'), [ATOM_CLASSES.DOC, ATOM_CLASSES.SYMBOL]);
  assert.deepEqual(classifyToken('morning-gates-two-moments'), [ATOM_CLASSES.CARD, ATOM_CLASSES.DOC]);
  assert.deepEqual(classifyToken('decideTransition'), [ATOM_CLASSES.SYMBOL]);
  assert.deepEqual(classifyToken('PromoDeclineReason'), [ATOM_CLASSES.SYMBOL]);
});

test('хвост «:74» — адрес строки, не часть имени файла', () => {
  assert.deepEqual(classifyToken('schema.prisma:270'), [ATOM_CLASSES.PATH, ATOM_CLASSES.DOC]);
  assert.deepEqual(classifyToken('scripts/ritual-evening-run.mjs:178'), [ATOM_CLASSES.PATH]);
});

test('snake_case — строковый литерал протокола, а не символ кода', () => {
  assert.deepEqual(classifyToken('promo_revoked'), [ATOM_CLASSES.OPAQUE]);
  assert.deepEqual(classifyToken('same_tariff'), [ATOM_CLASSES.OPAQUE]);
});

test('форма без адреса честно становится opaque, а не догадкой', () => {
  assert.deepEqual(classifyToken('9 PR'), [ATOM_CLASSES.OPAQUE]);
  assert.deepEqual(classifyToken(''), [ATOM_CLASSES.OPAQUE]);
  assert.deepEqual(classifyToken(undefined), [ATOM_CLASSES.OPAQUE]);
  assert.deepEqual(classifyToken('packages/background-cabinet/src'), [ATOM_CLASSES.OPAQUE]);
});

test('клиентский контекст распознаётся по явным словам, а не по близости номера PR', () => {
  assert.equal(mentionsClientSide('провести ревью клиентской части #1776'), true);
  assert.equal(mentionsClientSide('enum ↔ i18n-строки ↔ UI-состояние'), true);
  assert.equal(mentionsClientSide('семь honest-fix контура доставки #1765'), false);
});

test('атом несёт строку и контекст, клиентский признак берётся из своей строки', () => {
  const md = 'Ревью клиентской части `#1776`: пять причин → i18n → UI.';
  const [atom] = extractAtoms(md);
  assert.equal(atom.token, '#1776');
  assert.equal(atom.line, 1);
  assert.equal(atom.clientSide, true);
  assert.ok(atom.context.includes('Ревью клиентской части'));
});

test('dedupeAtoms сводит эхо шести ролей к одному атому, сохраняя клиентский признак', () => {
  const md = [
    'Тимлид: `decideTransition` замкнул магистраль.',
    'Архитектор: `decideTransition` получил потребителя.',
    'Верстальщик: ревью клиентской части `decideTransition`.',
  ].join('\n');
  const deduped = dedupeAtoms(extractAtoms(md));
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].occurrences, 3);
  assert.equal(deduped[0].clientSide, true);
  assert.equal(deduped[0].line, 1);
});

test('номер PR берётся и из прозы: протокол пишет #1776 без кавычек, как пишет человек', () => {
  const md = 'Провести ревью клиентской части #1776 и разобрать #1729.';
  const tokens = extractAtoms(md).map((a) => a.token);
  assert.deepEqual(tokens, ['#1776', '#1729']);
});

test('из прозы берутся ТОЛЬКО номера — прочее вне кавычек остаётся прозой', () => {
  const md = 'Магистраль decideTransition замкнута, очередь из 9 PR не сокращается.';
  assert.deepEqual(extractAtoms(md).map((a) => a.token), []);
});

test('долг попугая (#kebab) номером не считается — у него другой адрес', () => {
  const md = 'Долг заведён: #team-feedback-claims-code-unverified.';
  assert.deepEqual(extractAtoms(md).map((a) => a.token), []);
});

test('идентификатор прогона с датой — не карточка реестра: прогоны живут в журнале', () => {
  assert.deepEqual(classifyToken('ritual-day-2026-08-07-r2'), [ATOM_CLASSES.OPAQUE]);
  assert.deepEqual(classifyToken('morning-gates-two-moments'), [ATOM_CLASSES.CARD, ATOM_CLASSES.DOC]);
});

test('модальность распознаётся: «могут быть», «требующие», «есть ли» — это догадка', () => {
  assert.equal(isHedged('там могут быть UI-фрагменты, требующие отдельного прохода'), true);
  assert.equal(isHedged('есть ли различимый UX на все пять случаев — из журнала не видно'), true);
  assert.equal(isHedged('провести ревью клиентской части #1776: enum ↔ i18n ↔ UI'), false);
});

test('склейка эха считает «сказано твёрдо» ПО СТРОКЕ, а не по токену', () => {
  // Вещдок 08.08: #1740 в протоколе 06.08 упомянут пять раз, клиентский смысл несёт ровно
  // та строка, что говорит «могут быть». Твёрдого утверждения нет ни в одной — значит и
  // красного быть не должно.
  const hedgedOnly = dedupeAtoms(
    extractAtoms(
      [
        'Разобрать oversized-очередь (#1740, #1749).',
        'Собрать список UI-долгов: #1740 — там могут быть UI-фрагменты.',
      ].join('\n'),
    ),
  ).find((a) => a.token === '#1740');
  assert.equal(hedgedOnly.clientSide, true);
  assert.equal(hedgedOnly.clientSideFirm, false);

  const firm = dedupeAtoms(
    extractAtoms(
      [
        'Итоги дня: #1776 замкнул магистраль.',
        'Ревью клиентской части #1776: enum ↔ i18n ↔ UI-состояние.',
      ].join('\n'),
    ),
  ).find((a) => a.token === '#1776');
  assert.equal(firm.clientSideFirm, true);
});

test('ядро тотально: мусор на входе не бросает исключение', () => {
  assert.deepEqual(extractAtoms(undefined), []);
  assert.deepEqual(extractAtoms(null), []);
  assert.deepEqual(extractAtoms(42), []);
  assert.deepEqual(dedupeAtoms(undefined), []);
  assert.deepEqual(dedupeAtoms([null, { token: 1 }]), []);
});
