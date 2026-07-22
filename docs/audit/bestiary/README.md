# docs/audit/bestiary — контейнер бестиария антипаттернов

Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода).
Реализация [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md).
Эпик: `bestiary-container` (#878) · **CLOSED** ·
[`CLOSURE`](../../day-sprint/bestiary-container-2026-07-21/CLOSURE.md) · инсайт:
[`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md).

**Лемма:** контейнер обязан **ловить** бетий в `specimens/` своими детекторами.
Класс без specimen’а = украшение. Аудитор не молчун: `not-run` ≠ `clean`.

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).

**Мастерская дома** ([`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md), ось операций):
[`workshop.manifest.json`](./workshop.manifest.json) — осмотр `bestiary:audit`,
декомпозиция классов тем же CLI (реестр `BESTIARY_LIST`); `inspectElement` — ⚠ пока нет
отдельного CLI (Scenario Specimen-Audit — агентный гейт); `kit: null` до W4.
Доменный глагол поставки ловушек: **`issueTrap`** (контракт до W4; реализация кита — вне W1).

### Шов K25 (T6 ↔ HOME_WORKSHOP) — вариант **B**

Канон паттерна: мастерская — сторона **спроса** на kit. T6 шторма: эта мастерская —
**поставщик** ловушек. Закрыто **исключением**, без правки MUST-контракта паттерна:

- стрелка «мастерская заказывает kit» сохраняется (`kit: null` явно до жильца W4);
- поставка ловушек — доменный `issueTrap` (не MUST-тройка audit/decompose/inspect);
- строка в таблице реализаций паттерна помечает **K25-B** и причину.

Вариант A (правка MUST / supply-стрелки паттерна) **не** выбран.

### Чеклист HOME_WORKSHOP

1. ✅ `workshop.manifest.json` с полями `pattern`/`name`/`worksOn`(1)/`verbs`/`kit`.
2. ✅ `worksOn` = ровно `docs/audit/bestiary`; ссылка на паттерн резолвится; правила не скопированы.
3. ✅ `audit` и `decompose` присутствуют (MUST); `inspectElement` — ⚠ (нет CLI; Specimen-Audit — сценарий агента).
4. ✅ Доменная раскладка по `defectClass` не переписана через стек-примитивы (`domainPreserved`).
5. ✅ `kit` объявлен явно: `null` до W4 (имя жильца — open decision W4).
6. ✅ Доменный `issueTrap` несёт `worksOn` = дом бестиария (зуб `checkOwnership`).
7. ✅ Отказы видимы: недоступный kit после W4 — `unequipped`, не тихая подмена; до W4 `issueTrap` — контракт без вызова кита.
8. ✅ Провода: паттерн (таблица реализаций + K25-B), этот README, `AGENT_PROMPT` Scenario Issue-Trap.

## Engines (код снаружи)

| Engine | Путь | Роль |
|--------|------|------|
| Линза | [`scripts/lib/lens-bestiary.mjs`](../../../scripts/lib/lens-bestiary.mjs) | детекторы + `BESTIARY` + `aimBestiary` |
| CLI | [`scripts/lens-run.mjs`](../../../scripts/lens-run.mjs) | наведение → матрица / JSON |

В контейнере **нет** исполняемого кода (как у procedures Т12): только контракт,
снимки, specimens, analysis. Код не копировать.

## Соответствие паттерну GROUP_CONTAINERIZATION

1. ✅ Выделенный каталог `docs/audit/bestiary/`; артефакты группы — только здесь.
2. ✅ README-контракт с таблицей «что писать / в git?» (ниже).
3. ✅ Overwrite-реестр `registry/BESTIARY_LIST.md` с Meta (B2: производный от кода + specimens).
4. ✅ `cache/` под gitignore.
5. ✅ `yarn bestiary:audit` пишет реестр сам; источник истины классов — `BESTIARY` в engines.
6. ✅ `AGENT_PROMPT.md`; Scenario Specimen-Audit с HARD GATE на класс; Scenario Weekly-Report (B4).
7. ✅ Массовое «лечение» находок запрещено (#533 — линза находит, не чинит); правки кода — отдельные задачи.
8. ✅ Провода: `docs/audit/README.md`, `AGENTS.md`, эпик OPEN; `yarn bestiary:weekly` → `analysis/`.

## Layout

```
docs/audit/bestiary/
  README.md              — этот файл
  AGENT_PROMPT.md        — setup агента
  workshop.manifest.json — мастерская HOME_WORKSHOP (W1; K25-B)
  registry/              — BESTIARY_LIST.md (производный overwrite)
  analysis/              — недельные / точечные прогоны (dated)
  specimens/<class>/     — намеренный плохой код (бетии); B2×4 + B3 echo
  cache/                 — сырые JSON прогонов (gitignore)
```

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `registry/BESTIARY_LIST.md` | Канонический снимок классов × покрытие specimen (overwrite) | да |
| `registry/BESTIARY_LIST-YYYY-MM-DD.md` | Опциональный dated-архив | да |
| `specimens/<defectClass>/**` | Specimen’ы с пометкой `specimen:` / meta | да |
| `analysis/bestiary-run-YYYY-MM-DD.md` | Недельный отчёт (`yarn bestiary:weekly`, B4/#883); Summary всегда | да |
| `cache/**` | Сырой JSON (`lens-run --json`) | **нет** (gitignore) |

**Источник истины классов:** массив `BESTIARY` в `scripts/lib/lens-bestiary.mjs`.
Контейнер хранит производные снимки и бетий, не дублирует детекторы.

## Retention

- Markdown `registry/` / `analysis/` / `specimens/` — коммитим.
- `cache/` — локальный scratch.

## Как вызвать агента

1. Указать: `docs/audit/bestiary/AGENT_PROMPT.md`.
2. Сценарии — в промпте (Inventory / Specimen-Audit / Weekly-Report).
