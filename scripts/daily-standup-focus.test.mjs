/**
 * Зубы «фокус дня берётся у владельца» (сессия E, 23.09).
 *
 * Предмет: стендап не назначает магистраль сам. Три утра подряд (21–23.09) генератор
 * называл фокусом своё (`tariff…`, `secret-parser-built`, `angelina-hostess-impl`), а
 * владелец выбирал другое из замороженного топ-3 — расхождение ловилось руками ведущей.
 *
 * Функции чистые: ни сети, ни файловой системы, ни часов — день и документ приходят
 * параметрами. Модель в зубах не участвует: проверяется то, что ей велено, и то, что
 * скрипт гарантирует после её ответа.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractOwnerFocusClaim,
  resolveOwnerFocus,
  focusDirectiveLines,
  enforceOwnerFocus,
  focusProvenanceLine,
} from './_daily-standup.mjs';

const TODAY = '2026-09-23';

const claimToday =
  'Владелец 23.09: магистраль — cabinet-registration-rollout (ответ «1» на замороженный снимок из трёх). ' +
  'ЗАМЕР утра 23.09 (ствол 271e9164): эпик регистрации по приглашению #2369 целиком в стволе.';

const assertionsToday = {
  sources: [
    {
      claim: claimToday,
      origin: 'owner-choice@chat/magistral-23-09',
      date: TODAY,
      author: 'human',
    },
    { claim: 'вчерашний выбор', origin: 'owner-choice@chat/magistral-22-09', date: '2026-09-22', author: 'human' },
  ],
};

const assertionsYesterday = {
  sources: [
    { claim: 'Владелец 22.09: магистраль — tariff-transitions-live.', origin: 'owner-choice@chat/magistral-22-09', date: '2026-09-22', author: 'human' },
  ],
};

// ─── извлечение текста выбора ─────────────────────────────────────────────────────────

test('extractOwnerFocusClaim: берёт первое предложение до слова ЗАМЕР', () => {
  const text = extractOwnerFocusClaim(claimToday);
  assert.match(text, /^Владелец 23\.09: магистраль — cabinet-registration-rollout/u);
  assert.equal(text.includes('ЗАМЕР'), false, 'замер утра в фокус дня не едет');
  assert.equal(text.endsWith(' '), false, 'хвостовые пробелы срезаны');
});

test('extractOwnerFocusClaim: без слова ЗАМЕР — не длиннее 300 знаков', () => {
  const long = `Владелец: магистраль — ${'x'.repeat(500)}`;
  const text = extractOwnerFocusClaim(long);
  assert.ok(text.length <= 300, `получено ${text.length} знаков`);
  assert.ok(text.startsWith('Владелец: магистраль —'));
});

test('extractOwnerFocusClaim: пусто и не строка — пустая строка, не падение', () => {
  assert.equal(extractOwnerFocusClaim(''), '');
  assert.equal(extractOwnerFocusClaim(undefined), '');
  assert.equal(extractOwnerFocusClaim(null), '');
  assert.equal(extractOwnerFocusClaim(42), '');
});

// ─── разрешение выбора владельца ──────────────────────────────────────────────────────

test('resolveOwnerFocus: сегодняшний выбор человека — фокус взят у владельца с источником', () => {
  const focus = resolveOwnerFocus({ assertions: assertionsToday, today: TODAY });
  assert.equal(focus.chosen, true);
  assert.match(focus.text, /cabinet-registration-rollout/u);
  assert.equal(focus.origin, 'owner-choice@chat/magistral-23-09');
  assert.equal(focus.date, TODAY);
});

test('resolveOwnerFocus: вчерашний выбор — не сегодняшний, фокус не назначается', () => {
  const focus = resolveOwnerFocus({ assertions: assertionsYesterday, today: TODAY });
  assert.equal(focus.chosen, false);
  assert.equal(
    focus.line,
    `Магистраль владельцем ещё не выбрана (owner-choice отсутствует на ${TODAY}); стендап фокус не назначает`,
  );
  assert.equal(focus.text, '');
});

test('resolveOwnerFocus: файла нет (null/undefined) — та же строка, не падение', () => {
  for (const assertions of [null, undefined, {}, { sources: [] }, { sources: 'не список' }]) {
    const focus = resolveOwnerFocus({ assertions, today: TODAY });
    assert.equal(focus.chosen, false, `вход ${JSON.stringify(assertions)}`);
    assert.match(focus.line, /owner-choice отсутствует на 2026-09-23/u);
  }
});

test('resolveOwnerFocus: автор не человек — выбор скрипта фокусом не становится', () => {
  const machine = {
    sources: [{ claim: 'Магистраль — angelina-hostess-impl', origin: 'standup@script', date: TODAY, author: 'script' }],
  };
  const focus = resolveOwnerFocus({ assertions: machine, today: TODAY });
  assert.equal(focus.chosen, false, 'author: human обязателен — иначе это снова выбор скрипта');
  assert.match(focus.line, /стендап фокус не назначает/u);
});

test('resolveOwnerFocus: сегодняшний источник с пустым claim — фокуса нет, не пустая строка фокуса', () => {
  const empty = { sources: [{ claim: '   ', origin: 'owner-choice@chat/magistral-23-09', date: TODAY, author: 'human' }] };
  const focus = resolveOwnerFocus({ assertions: empty, today: TODAY });
  assert.equal(focus.chosen, false);
  assert.match(focus.line, /стендап фокус не назначает/u);
});

// ─── что получает модель ──────────────────────────────────────────────────────────────

test('focusDirectiveLines: при выборе владельца модель получает данность и запрет выбирать иной', () => {
  const focus = resolveOwnerFocus({ assertions: assertionsToday, today: TODAY });
  const text = focusDirectiveLines(focus).join('\n');
  assert.match(text, /фокус дня уже выбран владельцем/u);
  assert.match(text, /cabinet-registration-rollout/u);
  assert.match(text, /не выбирай другой/iu);
});

test('focusDirectiveLines: без выбора модель фокус не сочиняет', () => {
  const focus = resolveOwnerFocus({ assertions: null, today: TODAY });
  const text = focusDirectiveLines(focus).join('\n');
  assert.match(text, /не назначает/u);
  assert.match(text, /не выдумывай|не сочиняй/iu);
  assert.equal(/фокус дня уже выбран владельцем/u.test(text), false);
});

// ─── что гарантирует скрипт после ответа модели ───────────────────────────────────────

test('enforceOwnerFocus: модель назвала свой фокус — первой строкой раздела встаёт выбор владельца', () => {
  const focus = resolveOwnerFocus({ assertions: assertionsToday, today: TODAY });
  const model = ['## Фокус дня', '', '- **Магистраль: angelina-hostess-impl** — хозяйка ритуала.', '', '## Что сознательно не делаем', '', '- не трогаем прод'].join('\n');
  const { text, substituted } = enforceOwnerFocus(model, focus);
  assert.equal(substituted, true, 'расхождение со стендапом чинится механикой, не инструкцией');
  const focusSection = text.slice(text.indexOf('## Фокус дня'), text.indexOf('## Что сознательно не делаем'));
  assert.match(focusSection, /cabinet-registration-rollout/u);
  assert.ok(
    focusSection.indexOf('cabinet-registration-rollout') < focusSection.indexOf('angelina-hostess-impl'),
    'выбор владельца стоит первым',
  );
  assert.match(text, /## Что сознательно не делаем/u, 'остальные разделы не тронуты');
});

test('enforceOwnerFocus: строка владельца уже первой — второй раз не вставляется', () => {
  const focus = resolveOwnerFocus({ assertions: assertionsToday, today: TODAY });
  const once = enforceOwnerFocus('## Фокус дня\n\n- разбор\n', focus).text;
  const twice = enforceOwnerFocus(once, focus);
  assert.equal(twice.substituted, false);
  assert.equal(twice.text, once, 'идемпотентно');
  assert.equal(twice.text.split('cabinet-registration-rollout').length - 1, 1, 'ровно одно упоминание');
});

test('enforceOwnerFocus: без выбора владельца под заголовком стоит ровно строка отказа', () => {
  const focus = resolveOwnerFocus({ assertions: null, today: TODAY });
  const { text } = enforceOwnerFocus('## Фокус дня\n\n- **Магистраль: secret-parser-built**\n\n## Что сознательно не делаем\n', focus);
  const section = text.slice(text.indexOf('## Фокус дня'), text.indexOf('## Что сознательно не делаем'));
  assert.match(section, /Магистраль владельцем ещё не выбрана \(owner-choice отсутствует на 2026-09-23\); стендап фокус не назначает/u);
  assert.ok(
    section.indexOf('Магистраль владельцем ещё не выбрана') < section.indexOf('secret-parser-built'),
    'отказ стоит первым, самоназначенный фокус за ним',
  );
});

test('enforceOwnerFocus: модель забыла заголовок — раздел появляется целиком', () => {
  const focus = resolveOwnerFocus({ assertions: assertionsToday, today: TODAY });
  const { text } = enforceOwnerFocus('## Что сознательно не делаем\n\n- не трогаем прод\n', focus);
  assert.match(text, /## Фокус дня/u);
  assert.match(text, /cabinet-registration-rollout/u);
  assert.ok(text.indexOf('## Фокус дня') < text.indexOf('## Что сознательно не делаем'));
});

// ─── источник в шапке ─────────────────────────────────────────────────────────────────

test('focusProvenanceLine: источник фокуса — origin выбора либо «нет»', () => {
  const chosen = resolveOwnerFocus({ assertions: assertionsToday, today: TODAY });
  assert.match(focusProvenanceLine(chosen), /owner-choice@chat\/magistral-23-09/u);
  const absent = resolveOwnerFocus({ assertions: null, today: TODAY });
  assert.match(focusProvenanceLine(absent), /нет/u);
  assert.equal(/owner-choice@/u.test(focusProvenanceLine(absent)), false);
});
