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

// ─── регрессия 21.07: обрезка 95К съедала ЗАДАНИЕ со скелетом слотов ─────────────
// Задание лежало ПОСЛЕДНЕЙ секцией, `assembled.slice(0, MAX_CONTEXT_CHARS)` резал
// хвост → модель не видела ни одного `## <слот>` и гейт M2 валил все 5 разом.
// Инвариант: при любом раздутии контекста задание доживает до модели целиком.

test('обрезка main-day-issue: задание со всеми 5 слотами доживает до модели', async () => {
  const { assembleStandupPrompt } = await import('./_daily-standup.mjs');
  const assignment = ['# Задание', '', ...frame().map((s) => `## ${s.title}`)].join('\n');
  const huge = 'x'.repeat(300_000); // 176 активных промптов уже пробивали потолок 95К
  const out = assembleStandupPrompt({ context: huge, assignment, maxChars: 95_000 });
  assert.deepEqual(missingSlotHeadings(out), [], 'все 5 заголовков слотов пережили обрезку');
  assert.match(out, /контекст обрезан/u, 'обрезан именно контекст, и это сказано явно');
  assert.ok(out.length <= 95_000, `бюджет соблюдён строго, получено ${out.length}`);
});

test('провод: main-day-issue собирает промпт защищённой сборкой, не голым slice', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./_main-day-issue.mjs', import.meta.url), 'utf8');
  assert.match(src, /assembleStandupPrompt\(\{/u, 'генератор зовёт защищённую сборку');
  assert.doesNotMatch(
    src,
    /assembled\.slice\(0,\s*MAX_CONTEXT_CHARS\)/u,
    'голая обрезка хвоста (терявшая задание) не вернулась',
  );
});

// ─── Ф3 #788 (T11): перезапуск генерации с поправкой, не слепой ретрай ───────────

test('skeletonCorrection: поправка несёт диагноз и требование строгих заголовков', async () => {
  const { skeletonCorrection } = await import('./_main-day-issue.mjs');
  const note = skeletonCorrection(['Магистраль', 'Санитарные']);
  assert.match(note, /Магистраль, Санитарные/u, 'потерянные слоты названы поимённо');
  assert.match(note, /##\s*<название>/u, 'формат заголовка задан строго');
  assert.match(note, /— пусто —/u, 'пустой слот легален, заголовок не роняется');
});

test('провод Ф3: генерация перезапускается с поправкой, попытки ограничены', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./_main-day-issue.mjs', import.meta.url), 'utf8');
  assert.match(src, /MAX_ATTEMPTS = 2/u, 'ровно две попытки — без бесконечного цикла');
  assert.match(src, /skeletonCorrection\(lastMissing\)/u, 'вторая попытка идёт с диагнозом');
});
