import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractDayDigest,
  extractEveningDigest,
  stripInlineMd,
} from './lib/ritual-digest-extract.mjs';

const DAY_FIXTURE = `<!-- Сгенерировано -->

# MAIN_DAY_ISSUE — 2026-07-13

**Дата:** 2026-07-13 | **Координатор:** Vesnin

\`\`\`
┌──────────────────────────────────────────────┐
│                                              │
│ ⚡ ЗАМКНУТЬ КОНТУР КАЧЕСТВА                  │
│    + СТАРТ ПРОДУКТОВОЙ ПОЛОСЫ                │
│                                              │
│    Вчера — ядро контура готово.              │
│                                              │
│    Задача 1 (DA4, M): логика триггеров       │
│      чистой функцией; graceful при           │
│      недоступном канале.                     │
│    Задача 2 (DA5, S): утренняя секция        │
│      дайджеста, тест на рендер.              │
│                                              │
│ 🎯 Магистраль: процессный контур             │
│    (DA4/DA5, эпик #396).                     │
│                                              │
└──────────────────────────────────────────────┘
\`\`\`
`;

const EVENING_FIXTURE = `<!-- Сгенерировано -->

# Team Evening Feedback — 2026-07-12

[Teamlead]: Vesnin. Полезность дня: 8/10

### Голосование за полезность дня

| Роль | Балл /10 |
|------|----------|
| Teamlead | 8 |

**Средний балл команды:** 7.4/10

### Сводка предложений на завтра

1. **Зафиксировать контур качества как магистраль дня** с самого утра — не допустить расхождения (Teamlead).
2. **Вернуть отложенную таблицу объяснимости** \`trends\` vs yamnet (Математик).

### Резюме Teamlead

- **Соответствие стратегии дня:** частично.
- **Вердикт дня:** День продуктивный, но со сдвигом фокуса: главная цель закрыта (**#372**), энергия ушла в новый контур \`drift-anchor\`.
`;

test('stripInlineMd снимает жирный/код/ссылки', () => {
  assert.equal(
    stripInlineMd('**Жирно** и `код` и [текст](https://x)'),
    'Жирно и код и текст',
  );
});

test('extractDayDigest: дата, ⚡-заголовок, задачи с продолжениями, магистраль', () => {
  const d = extractDayDigest(DAY_FIXTURE);
  assert.equal(d.kind, 'day');
  assert.equal(d.date, '2026-07-13');
  assert.equal(d.headline, 'ЗАМКНУТЬ КОНТУР КАЧЕСТВА + СТАРТ ПРОДУКТОВОЙ ПОЛОСЫ');
  assert.deepEqual(d.points, [
    'логика триггеров чистой функцией; graceful при недоступном канале',
    'утренняя секция дайджеста, тест на рендер',
  ]);
  assert.equal(d.techFooter, 'Магистраль: процессный контур (DA4/DA5, эпик #396).');
});

test('extractDayDigest: нераспознанный артефакт → null (graceful)', () => {
  assert.equal(extractDayDigest(''), null);
  assert.equal(extractDayDigest('# MAIN_DAY_ISSUE — 2026-07-13\nбез бокса'), null);
});

test('extractEveningDigest: дата, вердикт без markdown, балл, предложения', () => {
  const d = extractEveningDigest(EVENING_FIXTURE);
  assert.equal(d.kind, 'evening');
  assert.equal(d.date, '2026-07-12');
  assert.equal(d.teamScore, '7.4/10');
  assert.ok(d.headline.startsWith('День продуктивный'));
  assert.ok(!d.headline.includes('**'), 'markdown снят');
  assert.deepEqual(d.points, [
    'Зафиксировать контур качества как магистраль дня',
    'Вернуть отложенную таблицу объяснимости',
  ]);
});

test('extractEveningDigest: без вердикта — фолбэк-headline, без даты — null', () => {
  const noVerdict = extractEveningDigest('# Team Evening Feedback — 2026-07-12\n');
  assert.ok(noVerdict.headline.includes('Вечерний ритуал завершён'));
  assert.equal(extractEveningDigest('нет даты'), null);
});
