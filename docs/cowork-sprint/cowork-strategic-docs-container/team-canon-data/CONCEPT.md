<!-- Cowork block canon-data · Phase 1 · сгенерировано через xai/grok-4.5 (оркестровка), изоляция соблюдена -->

# canon-data: модель канона стратегических документов

## Назначение блока

Держать **один источник истины** для фактов, по которым агенты сверяют курс. Сегодня один и тот же факт живёт в README / AGENTS.md / CLAUDE.md и рассинхронизируется. Мы выносим факт в **гранулу**, собираем из гранул **шаблоны**, рендерим **релизы**. Правка гранулы один раз → все релизы, которые на неё ссылаются, съезжаются к одному значению.

Блок отвечает только за **данные и чистые предикаты/операции над ними**. I/O, git-hook'и, вызов движков — на краю (адаптеры соседей).

Рабочая зона:
- `docs/containers/strategic-docs/**` — канон (гранулы, шаблоны, релизы-стабы)
- `scripts/lib/strategic-docs-model.mjs` — чистая модель
- `scripts/lib/strategic-docs-model.test.mjs` — пруф на стабах
- `docs/cowork-sprint/cowork-strategic-docs-container/team-canon-data/**` — артефакты команды

Реальные `README.md` / `AGENTS.md` / `CLAUDE.md` в корне **не трогаем** — только стаб-копии в своей зоне.

---

## Git-структура трёх списков

```
docs/containers/strategic-docs/
├── granules/
│   ├── <granule-id>/
│   │   ├── granule.json      # метаданные + версия
│   │   └── body.md           # литерал (если kind=literal)
│   └── ...
├── templates/
│   ├── <template-id>/
│   │   └── template.json     # композиция гранул с пинами
│   └── ...
├── releases/
│   ├── <release-id>/
│   │   ├── release.json      # манифест: шаблон, пины, статус
│   │   └── body.md           # read-only результат рендера (стаб)
│   └── ...
└── stubs/                    # стаб-копии «трёх релизов» для пруфа
    ├── README.md
    ├── AGENTS.md
    └── CLAUDE.md
```

Источник истины — git. Notion/Coda/Affine только подкрепляют, не владеют каноном.

---

## Модель данных

### Гранула

Атом-инструкция. Два `kind`:

| kind       | смысл                                      | тело                         |
|------------|--------------------------------------------|------------------------------|
| `literal`  | фиксированный текст                        | `body.md` (строка)           |
| `function` | чистая функция `(ctx) => string`           | ссылка на чистый модуль      |

```ts
// granule.json
{
  "id": "course-north-star",          // стабильный идентификатор
  "version": "1.2.0",                 // semver, бампится при изменении смысла
  "kind": "literal" | "function",
  "bodyPath": "./body.md",            // для literal
  "fn": "courseNorthStar",            // для function — имя экспорта чистой ф-ции
  "description": "Одно предложение: зачем гранула"
}
```

**Инвариант:** гранула-скрипт — **чистая функция**. Никакого fs/network/process внутри. I/O только в адаптере на краю (генератор/движок).

### Шаблон

Композиция гранул с **пинами версий**.

```ts
// template.json
{
  "id": "agents-main",
  "version": "0.3.0",
  "target": "AGENTS.md",              // логическое имя продукта
  "slots": [
    {
      "granuleId": "course-north-star",
      "pin": "1.2.0",                 // exact pin (semver)
      "placeholder": "{{north_star}}" // метка в каркасе
    },
    {
      "granuleId": "review-policy",
      "pin": "2.0.1",
      "placeholder": "{{review_policy}}"
    }
  ],
  "skeleton": "# AGENTS\n\n{{north_star}}\n\n{{review_policy}}\n"
}
```

Пин — **exact** (`1.2.0`), не диапазон. Диапазоны запрещены в каноне: воспроизводимость > удобство.

### Релиз

Сгенерированный документ, **read-only**. В каноне хранится как манифест + тело; пересборка — только через генератор.

```ts
// release.json
{
  "id": "agents-main@2026-03-27",
  "templateId": "agents-main",
  "templateVersion": "0.3.0",
  "pins": {
    "course-north-star": "1.2.0",
    "review-policy": "2.0.1"
  },
  "status": "release" | "experiment",  // valid → release, иначе experiment
  "bodyPath": "./body.md",
  "renderedAt": "2026-03-27T12:00:00Z"
}
```

`status` выставляется предикатом `valid(template)` на момент генерации (генератор читает предикат из нашей модели — см. ожидания).

---

## Чистый предикат `valid(template)`

Сигнатура (pure):

```js
/**
 * @param {Template} template
 * @param {Map<string, Granule>} granuleIndex  // id@version → granule
 * @returns {{ ok: true } | { ok: false, reasons: string[] }}
 */
export function valid(template, granuleIndex) { ... }
```

Шаблон **валиден** iff все пункты истинны:

1. **Структура:** есть `id`, `version`, `skeleton`, `slots[]`; каждый slot имеет `granuleId`, `pin`, `placeholder`.
2. **Пины резолвятся:** для каждого slot ключ `${granuleId}@${pin}` есть в `granuleIndex`.
3. **Плейсхолдеры закрыты:** каждый `{{...}}` в `skeleton` упомянут ровно одним slot; нет лишних slot без метки в skeleton.
4. **Гранулы консистентны:** у каждой резолвнутой гранулы `kind ∈ {literal, function}`; у `literal` непустое тело; у `function` — имя чистого экспорта (без проверки I/O — это lint соседа, мы проверяем только наличие поля).
5. **Semver:** `template.version` и все `pin` — валидный semver (exact, без `^`/`~`/`*`).

Никакого I/O внутри `valid`. Индекс гранул передаётся аргументом (собрал адаптер/тест).

Невалидный шаблон генератор обязан направить в `experiments/`, валидный — в `releases/`. Это контракт соседа; мы только даём предикат.

---

## `syncGranule` и пруф моата синхронности

### Операция

```js
/**
 * Чистая операция: вернуть новые тела релизов, где содержимое гранулы
 * `granuleId@fromVersion` заменено на `newBody`, с бампом pin → toVersion.
 *
 * @param {SyncRequest} req
 * @returns {SyncResult}
 */
export function syncGranule(req) { ... }

/**
 * @typedef {Object} SyncRequest
 * @property {string} granuleId
 * @property {string} fromVersion
 * @property {string} toVersion
 * @property {string} newBody              // новое тело литерала
 * @property {ReleaseSnap[]} releases      // снимки релизов (id, body, pins)
 *
 * @typedef {Object} ReleaseSnap
 * @property {string} id
 * @property {string} body
 * @property {Record<string,string>} pins  // granuleId → version
 *
 * @typedef {Object} SyncResult
 * @property {ReleaseSnap[]} updated       // только затронутые
 * @property {ReleaseSnap[]} skipped       // пин не совпал / гранулы нет
 */
```

Алгоритм (pure):

1. Для каждого `release` из `req.releases`:
   - если `release.pins[granuleId] !== fromVersion` → в `skipped`;
   - иначе заменить в `body` старый фрагмент гранулы на `newBody` (границы фрагмента задаёт маркер вида `<!-- granule:course-north-star@1.2.0 -->...<!-- /granule -->`), обновить пин на `toVersion`, бамп маркера → в `updated`.
2. Вернуть `{ updated, skipped }`. Без записи на диск.

Маркеры гранул в теле релиза — часть контракта рендера (сосед-renderer обязан их ставить; мы в стабах ставим сами).

### Пруф синхронности на стаб-копиях

Фикстура в `docs/containers/strategic-docs/stubs/`:

| стаб        | роль                     | содержит гранулу `course-north-star@1.0.0` |
|-------------|--------------------------|--------------------------------------------|
| `README.md` | стаб корневого README    | да                                         |
| `AGENTS.md` | стаб AGENTS              | да                                         |
| `CLAUDE.md` | стаб CLAUDE              | да                                         |

Один факт (например, формулировка north-star) изначально **разный** в трёх стабах — имитация «сегодняшней боли». Тест:

```js
// scripts/lib/strategic-docs-model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valid, syncGranule, loadStubSnaps } from './strategic-docs-model.mjs';

test('valid: ok на корректном шаблоне, fail на битом пине', () => {
  // ... собираем template + granuleIndex из фикстур зоны
  assert.equal(valid(goodTemplate, index).ok, true);
  assert.equal(valid(brokenPinTemplate, index).ok, false);
});

test('syncGranule: правка одной гранулы сводит три стаб-релиза к одному значению', () => {
  const snaps = loadStubSnaps(); // читает stubs/*.md → ReleaseSnap[] (I/O на краю теста)
  const canon = 'Мы держим курс на синхронный канон для агентов и людей.';

  const { updated, skipped } = syncGranule({
    granuleId: 'course-north-star',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    newBody: canon,
    releases: snaps,
  });

  assert.equal(skipped.length, 0);
  assert.equal(updated.length, 3);

  const bodies = updated.map(r => extractGranule(r.body, 'course-north-star'));
  assert.equal(bodies[0], canon);
  assert.equal(bodies[1], canon);
  assert.equal(bodies[2], canon);
  // пины съехали
  for (const r of updated) {
    assert.equal(r.pins['course-north-star'], '1.1.0');
  }
});
```

`loadStubSnaps` / запись обратно на диск — **только в тесте или адаптере**, не в модели. Модель получает и возвращает значения.

**Моат:** один факт = одна гранула; три потребителя = три релиза с пином; `syncGranule` — механическая демонстрация, что правка точки истины выравнивает всех. Чат/прецеденты этого структурно не умеют — у них нет пина и read-only релиза.

---

## Модуль `strategic-docs-model.mjs`

Публичная поверхность (всё pure, кроме явных `*FromFs` хелперов, которые тесту можно, а канону модели — нет):

```js
// versions
export function isExactSemver(s: string): boolean
export function parsePin(s: string): string        // throw, если не exact

// index
export function granuleKey(id: string, version: string): string  // "id@version"

// predicate
export function valid(template, granuleIndex): { ok: true } | { ok: false, reasons: string[] }

// sync
export function syncGranule(req): SyncResult
export function extractGranule(body: string, granuleId: string): string
export function applyGranuleMarkers(body: string, granuleId: string, version: string, fragment: string): string

// fixtures helper (для теста; I/O на краю)
export function loadStubSnaps(stubsDir = DEFAULT_STUBS): ReleaseSnap[]
```

DoD Phase 1:
- [x] `valid(template)` — pure, покрыт тестом ok/fail
- [x] `syncGranule()` — pure, покрыт тестом «три стаба → одно значение»
- [x] version/pin — exact semver, зелёные проверки
- [x] `node --test scripts/lib/strategic-docs-model.test.mjs` — green
- [x] реальные README/AGENTS/CLAUDE.md не изменены

---

## Что блок сознательно НЕ делает

- Не рендерит шаблон в документ (это engine-renderer).
- Не решает, куда класть invalid (это generators-validation) — только отдаёт `valid(...)`.
- Не пишет в git и не дергает Notion/Coda.
- Не согласовывает схему гранулы с соседями в этом документе — поля выше являются **нашим** каноном зоны; сводная схема — на Интерфейс-консилиуме.
