/**
 * Тесты сборки канона кодом (M2-B angelina-hostess). Чистые, без сети/LLM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assemble, normalizeFill, sign, digestOk, canonicalize,
  FILL_STATUS, PREMISES_TITLE, CANON_AUTHORS,
} from './lib/day-plan-assemble.mjs';
import { frame } from './lib/day-plan-frame.mjs';
import { missingSlotHeadings } from './_main-day-issue.mjs';

const fullFills = () => Object.fromEntries(frame().map((s) => [s.id, { text: `тело ${s.id}` }]));

test('assemble: тотальна — всегда 5 секций плана + посылки, заголовки из frame', () => {
  const { markdown } = assemble(fullFills(), { premises: ['посылка А'] });
  for (const s of frame()) assert.match(markdown, new RegExp(`^## ${s.title}$`, 'mu'));
  assert.match(markdown, new RegExp(`^## ${PREMISES_TITLE}$`, 'mu'));
  assert.match(markdown, /- посылка А/u);
});

test('assemble: выход проходит гейт скелета генератора (интеграция со стражем)', () => {
  const { markdown } = assemble(fullFills());
  assert.deepEqual(missingSlotHeadings(markdown), [], 'сборка кодом не может уронить слот');
});

test('assemble: пустой/битый слот — видимый маркер словами + сводка, не отказ', () => {
  const fills = fullFills();
  delete fills.sanitary;
  fills.experimental = { text: '', status: FILL_STATUS.MALFORMED };
  const { markdown, emptyCount, statuses } = assemble(fills);
  assert.equal(emptyCount, 2);
  assert.match(markdown, /слот пуст: наполнение не удалось/u);
  assert.match(markdown, /слот битый/u);
  assert.match(markdown, /слотов пусто\/бито: 2 из 5/u);
  assert.equal(statuses.sanitary, FILL_STATUS.EMPTY);
  assert.deepEqual(missingSlotHeadings(markdown), [], 'даже с дырами скелет цел');
});

test('assemble: без посылок — секция всё равно эмитится с явной строкой', () => {
  const { markdown } = assemble(fullFills());
  assert.match(markdown, /посылок probe на сегодня нет/u);
});

test('normalizeFill: строка → filled; пусто/мусор → empty; статус уважается', () => {
  assert.equal(normalizeFill({ text: 'x' }).status, FILL_STATUS.FILLED);
  assert.equal(normalizeFill({ text: '  ' }).status, FILL_STATUS.EMPTY);
  assert.equal(normalizeFill(null).status, FILL_STATUS.EMPTY);
  assert.equal(normalizeFill({ text: 'x', status: FILL_STATUS.MALFORMED }).status, FILL_STATUS.MALFORMED);
});

test('sign/digestOk: честная подпись проходит, подмена дайджеста — нет', () => {
  const doc = '# Канон\nтело';
  const sig = sign(doc, 'human', { signedAt: '2026-07-21' });
  assert.equal(sig.author, 'human');
  assert.equal(digestOk(doc, sig), true);
  assert.equal(digestOk(doc + ' подмена', sig), false);
  assert.equal(digestOk(doc, { digest: 'deadbeef' }), false);
});

test('sign: author вне {llm, human} — бросает (фиксируется на входе)', () => {
  assert.throws(() => sign('x', 'subagent'), /∉/u);
  assert.deepEqual([...CANON_AUTHORS], ['llm', 'human']);
});

test('canonicalize: CRLF и хвостовые пробелы не ломают digest', () => {
  const a = sign('тело\r\nстрока\n\n', 'llm');
  const b = sign('тело\nстрока', 'llm');
  assert.equal(a.digest, b.digest);
});
