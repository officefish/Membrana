import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractDayDigest,
  extractDigestHeader,
  extractEveningDigest,
  extractEveningTracks,
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

// ─── v2 (#434): полные блоки задач дня, треки вечера, шапка-пояснение ───

const DAY_FIXTURE_V2 = `# MAIN_DAY_ISSUE — 2026-07-14

\`\`\`
┌──────────────────────────────────────────────┐
│                                              │
│ ⚡ ВЕРНУТЬ БАЛАНС К ПРОДУКТУ                 │
│                                              │
│    Задача A (M): сводная таблица двух        │
│      распознавателей на общем наборе.        │
│      Явно назвать основной и бэкап.          │
│      Что даст: обоснованный выбор для        │
│      шлюза качества.                         │
│    Задача B (S): перф-замер нейро-канала.    │
│                                              │
│ 🎯 Магистраль: продукт FREE.                 │
│                                              │
└──────────────────────────────────────────────┘
\`\`\`
`;

test('extractDayDigest v2: полный блок задачи (несколько предложений, «что даст»)', () => {
  const d = extractDayDigest(DAY_FIXTURE_V2);
  assert.equal(d.points.length, 2);
  assert.equal(
    d.points[0],
    'сводная таблица двух распознавателей на общем наборе. Явно назвать основной и бэкап. Что даст: обоснованный выбор для шлюза качества',
  );
  assert.equal(d.points[1], 'перф-замер нейро-канала');
});

const EVENING_FIXTURE_V2 = `# Team Evening Feedback — 2026-07-13

[Teamlead]: Vesnin.
Оценка артефактов: планы были согласованы.
Итоги дня: реально сдвинулось много, но **не по утреннему плану**. Закоммичены: контур качества и живой канал отчётов.
На завтра: вернуть фокус.
Полезность дня: 8/10

[Математик]: Dynin.
Оценка артефактов: мандат был ясен.
Итоги дня: по магистральной задаче следов нет — таблица не собрана. Зато косвенно затронута математика слияния. Третье предложение не должно попасть.
Полезность дня: 6/10

### Голосование за полезность дня

**Средний балл команды:** 7.4/10

### Сводка предложений на завтра

1. **Вернуть фокус к продукту** (Teamlead).

### Резюме Teamlead

- **Вердикт дня:** День продуктивный, но дрейфующий.
`;

test('extractEveningTracks: выжимка «Итоги дня» по ролям, 2 предложения, без markdown', () => {
  const tracks = extractEveningTracks(EVENING_FIXTURE_V2);
  assert.equal(tracks.length, 2);
  assert.equal(
    tracks[0],
    'Teamlead: реально сдвинулось много, но не по утреннему плану. Закоммичены: контур качества и живой канал отчётов.',
  );
  assert.ok(tracks[1].startsWith('Математик: по магистральной задаче следов нет'));
  assert.ok(!tracks[1].includes('Третье предложение'));
});

test('extractEveningDigest v2: tracks попадают в payload; без «Итоги дня» поле отсутствует', () => {
  const d = extractEveningDigest(EVENING_FIXTURE_V2);
  assert.equal(d.tracks.length, 2);
  const old = extractEveningDigest(EVENING_FIXTURE);
  assert.equal(old.tracks, undefined);
});

test('extractDigestHeader: содержимое между маркерами; без маркеров/пусто → null', () => {
  const md = `# Шапка

> служебный комментарий вне маркеров

<!-- digest-header:start -->
**Membrana** — сеть «ушей».

*Мини-словарь:* **PR** — порция изменений.
<!-- digest-header:end -->
`;
  assert.equal(
    extractDigestHeader(md),
    '**Membrana** — сеть «ушей».\n\n*Мини-словарь:* **PR** — порция изменений.',
  );
  assert.equal(extractDigestHeader('# без маркеров'), null);
  assert.equal(extractDigestHeader('<!-- digest-header:start --><!-- digest-header:end -->'), null);
});
