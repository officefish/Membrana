/**
 * Диагноз канала ritual-main-day-issue (#1239): звено обязано называть себя, а потерянные
 * слоты — ронять шаг громко. Тестируем чистые куски без сети: лог попытки, провенанс
 * в шапку, текст отказа. Гейт `missingSlotHeadings` НЕ ослабляем — проверяем, что он
 * по-прежнему требует ровно заголовок второго уровня.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attemptLogLine,
  missingSlotHeadings,
  provenanceLlmComment,
  skeletonCorrection,
  skeletonFailureMessage,
} from './_main-day-issue.mjs';

test('лог попытки называет звено и номер — удачную и провальную', () => {
  const ok = attemptLogLine({ provider: 'xai', model: 'grok-4.5', attemptIndex: 0, ok: true });
  assert.match(ok, /xai\/grok-4\.5/);
  assert.match(ok, /попытка 1/);

  const bad = attemptLogLine({ provider: 'deepseek', model: 'deepseek-chat', attemptIndex: 1, ok: false, errorClass: 'rate_limit' });
  assert.match(bad, /deepseek\/deepseek-chat/);
  assert.match(bad, /попытка 2/);
  assert.match(bad, /rate_limit/);
});

test('лог не молчит, когда звено себя не назвало', () => {
  const line = attemptLogLine({ attemptIndex: 0, ok: false });
  assert.match(line, /неизвестный провайдер/);
  assert.match(line, /причина не названа/);
});

test('провенанс звена — машиночитаемый комментарий в шапке', () => {
  const c = provenanceLlmComment({ provider: 'xai', model: 'grok-4.5', source: 'defaults', generations: 2 });
  assert.match(c, /provider=xai/);
  assert.match(c, /model=grok-4\.5/);
  assert.match(c, /source=defaults/);
  assert.match(c, /generations=2/);
});

test('провенанс без данных не притворяется полным', () => {
  assert.match(provenanceLlmComment({}), /provider=—/);
});

test('отказ гейта называет звено, слоты словами и место сырого ответа', () => {
  const msg = skeletonFailureMessage({
    missing: ['Магистраль', 'Подкрепления'],
    provider: 'deepseek',
    model: 'deepseek-chat',
    attempts: 2,
    rawPath: 'C:/temp/raw-response.md',
  });
  assert.match(msg, /deepseek\/deepseek-chat/);
  assert.match(msg, /Магистраль, Подкрепления/);
  assert.match(msg, /НЕ записан/);
  assert.match(msg, /C:\/temp\/raw-response\.md/);
});

test('отказ честен и когда вещдок сохранить не удалось', () => {
  const msg = skeletonFailureMessage({ missing: ['Магистраль'], attempts: 1, rawPath: null });
  assert.match(msg, /сохранить не удалось/);
});

test('гейт скелета не ослаблен: частичное совпадение заголовка слотом не считается', () => {
  const slots = missingSlotHeadings('');
  assert.ok(slots.length > 0, 'пустое тело обязано потерять все слоты');

  const [first] = slots;
  // Упоминание названия слота в тексте и заголовок третьего уровня — НЕ слот.
  const fake = `Здесь про ${first} много слов.\n\n### ${first}\n`;
  assert.ok(missingSlotHeadings(fake).includes(first), 'подгонка под сломанный канал: слот засчитан по упоминанию');

  const real = `## ${first}\n\nтекст\n`;
  assert.ok(!missingSlotHeadings(real).includes(first), 'настоящий заголовок второго уровня обязан считаться');
});

test('поправка перезапуска называет потерянные слоты', () => {
  assert.match(skeletonCorrection(['Магистраль']), /Магистраль/);
});
