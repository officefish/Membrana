/**
 * Зуб формата доклада капитану (хотфикс 27.07): оба пути — эталон проходит,
 * нарушения ловятся ПО ИМЕНАМ. Фикстура нарушений — реальный сбой 27.07:
 * доклад свободной прозой с номерами задач и именами провайдеров.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  reportBodyProblems,
  reportFormatProblems,
  reportStructureProblems,
} from './lib/report-format-check.mjs';

const CANON_OK = `# План на понедельник, 27 июля

Сегодня главный фокус — инструмент, а не продукт. Из трёх кандидатов осознанно
выбран инструментальный: защита главной ветки доводится от флага до свода правил.

## 🎯 Главная задача

Свод правил защиты главной ветки с автоматической сверкой заявленного и фактического.

## 🔧 В поддержку

- Проверка серверного слияния по зелёным проверкам.
- Строгая сверка описей наборов инструментов при отправке.

## 🔭 На будущее (вектор, не обязательство)

- Контейнер прожитого опыта и выжимка удачных находок из него.

## 🧪 На пробу (из свежих идей)

- Разрез дня на изолированные задания с раздачей по чатам.

## 🧹 Навести порядок (по вчерашнему дню)

- Прибрать осиротевшие черновики писем в архив.

В стороне сознательно оставлены переезд хранилища и разбор старых рабочих копий:
они не на пути главной задачи и подождут своей очереди без потерь.
`;

test('эталонный доклад проходит целиком', () => {
  const { ok, problems } = reportFormatProblems(CANON_OK);
  assert.deepEqual(problems, []);
  assert.equal(ok, true);
});

test('отсутствие секции ловится с её именем', () => {
  const broken = CANON_OK.replace(/## 🧪 На пробу[\s\S]*?(?=## 🧹)/u, '');
  const problems = reportStructureProblems(broken);
  assert.ok(problems.some((p) => p.rule === 'section' && p.message.includes('🧪')));
});

test('короткий вводный абзац — находка intro', () => {
  const broken = CANON_OK.replace(/Сегодня главный фокус[\s\S]*?(?=## 🎯)/u, 'Кратко.\n\n');
  const problems = reportStructureProblems(broken);
  assert.ok(problems.some((p) => p.rule === 'intro'));
});

test('нет заключительного абзаца — находка outro', () => {
  const broken = CANON_OK.replace(/В стороне сознательно[\s\S]*$/u, '');
  const problems = reportStructureProblems(broken);
  assert.ok(problems.some((p) => p.rule === 'outro'));
});

test('жаргон в теле ловится по классам: номер, файл, SHA, провайдер, код проверки', () => {
  const dirty = CANON_OK
    .replace('Свод правил защиты', 'Полиси #1310 из scripts/verify-branch-protection.mjs (коммит f8a3308c, deepseek, гейт M2) — свод правил защиты');
  const problems = reportBodyProblems(dirty);
  const rules = problems.map((p) => p.message);
  assert.ok(rules.some((m) => m.includes('issue-номер')));
  assert.ok(rules.some((m) => m.includes('имя файла')));
  assert.ok(rules.some((m) => m.includes('SHA')));
  assert.ok(rules.some((m) => m.includes('провайдер')));
  assert.ok(rules.some((m) => m.includes('код проверки')));
});

test('код-блоки и инлайн-код из проверки чистоты исключены', () => {
  const withCode = CANON_OK.replace(
    'они не на пути главной задачи и подождут своей очереди без потерь.',
    'они не на пути главной задачи и подождут своей очереди без потерь. Команда дня: `yarn verify:branch-protection`.',
  );
  assert.deepEqual(reportBodyProblems(withCode), []);
});
