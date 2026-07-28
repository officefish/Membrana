/**
 * Зуб провода линзы «живые ссылки» в гейт ласточки (слово владельца 28.07:
 * «исправь сразу провода линзы, научи всех агентов использовать инструмент
 * правильно»).
 *
 * Вещдоки-мотивы: 27.07 партнёрам ушли голые URL (пришли статикой), 28.07 —
 * голые коды «#N» (в телеграме просто текст). Линза checkLiveLinks существовала,
 * но гейт её не звал — норму держала память агента, а она подвела дважды.
 * Законная форма одна: markdown-ссылка `[#N](url)` — office конвертирует её в
 * <a href> (mdToTelegramHtml не менялся с 14.07, прод умеет).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkSwallowDraft } from './lib/swallow-mirror.mjs';

const BASE = [
  'Доброе утро! Интро одной фразой.',
  '',
  'Главное: раз.',
  'Также: два.',
  'Смотрим вперёд: три.',
  'Пробуем: четыре.',
  'Гигиена: пять.',
  '',
];

test('голый код #N в деталях — отказ гейта с готовой формой исправления', () => {
  const r = checkSwallowDraft([...BASE, 'Детали: #1401 (идея)'].join('\n'));
  assert.equal(r.ok, false, 'голый код — в телеграме просто текст, не ссылка');
  assert.ok(
    r.violations.some((v) => v.includes('кликабельно') && v.includes('1401')),
    'диагноз обязан нести готовую markdown-форму, а не только запрет',
  );
});

test('markdown-ссылка в деталях — законная форма, гейт пропускает', () => {
  const r = checkSwallowDraft(
    [...BASE, 'Детали: [#1401](https://github.com/officefish/Membrana/pull/1401) (идея)'].join('\n'),
  );
  assert.equal(r.ok, true, `неожиданные нарушения: ${r.violations.join(' · ')}`);
});

test('число-без-адреса в теле («задачи 1298, 1303») — тоже отказ', () => {
  const r = checkSwallowDraft(
    [
      'Доброе утро! Интро.',
      '',
      'Главное: закрыли задачи 1298, 1303 за день.',
      'Также: два.',
      'Смотрим вперёд: три.',
      'Пробуем: четыре.',
      'Гигиена: пять.',
      '',
      'Детали: [#1401](https://github.com/officefish/Membrana/pull/1401)',
    ].join('\n'),
  );
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('адреса нет')), 'голое число читается как задача');
});

test('issue против pull: подсказка ведёт на верный путь GitHub', () => {
  const r = checkSwallowDraft([...BASE, 'Детали: Issue #1366 (память)'].join('\n'));
  assert.ok(r.violations.some((v) => v.includes('/issues/1366')), 'для Issue — путь issues');
});
