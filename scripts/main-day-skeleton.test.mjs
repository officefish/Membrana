/**
 * Тезис 2: проводка каркаса K в main-day-issue. Без LLM: проверяем, что (а) промпт несёт
 * все 5 заголовков слотов из frame() (структуру задаёт детерминированный слой), (б) гейт
 * скелета ловит уроненный слот и пропускает полный.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { missingSlotHeadings } from './_main-day-issue.mjs';
import { frame } from './lib/day-plan-frame.mjs';

const fullBody = frame().map((s) => `## ${s.title}\n— пусто —`).join('\n\n');

test('гейт скелета: полное тело (все 5 слотов) проходит', () => {
  assert.deepEqual(missingSlotHeadings(fullBody), []);
});

test('гейт скелета: уроненный слот пойман по имени', () => {
  const broken = fullBody.replace('## Санитарные', '## Что-то другое');
  assert.deepEqual(missingSlotHeadings(broken), ['Санитарные']);
});

test('гейт скелета: пустое тело — все 5 отсутствуют', () => {
  assert.equal(missingSlotHeadings('').length, 5);
});

test('гейт скелета: слоты с текстом внутри проходят (наполнение свободно)', () => {
  const filled = frame().map((s) => `## ${s.title}\nЛюбой живой текст LLM.`).join('\n\n');
  assert.deepEqual(missingSlotHeadings(filled), []);
});
