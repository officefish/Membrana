# docs/audit/bestiary — контейнер бестиария антипаттернов

Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода).
Реализация [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md).
Эпик: `bestiary-container` (#878) · **CLOSED** ·
[`CLOSURE`](../../day-sprint/bestiary-container-2026-07-21/CLOSURE.md) · инсайт:
[`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md).

**Лемма:** контейнер обязан **ловить** бетий в `specimens/` своими детекторами.
Класс без specimen’а = украшение. Аудитор не молчун: `not-run` ≠ `clean`.

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).

### Монитор → Mintlify (thin mirror, W3)

| | |
|---|---|
| **Истина** | **git** — этот дом (`docs/audit/bestiary/`) + engines снаружи |
| **Монитор** | Mintlify · [`apps/docs/bestiary/`](../../../apps/docs/bestiary/) · группа `Bestiary — workshop` в [`docs.json`](../../../apps/docs/docs.json) |
| **Глубина** | **thin mirror** — overview + примеры улова/ловушки; **не** pin-манифест инструкций (#823 F4) в этом спринте |
| **Лемма** | Mintlify может отставать; сверка по git-путям (SHA при необходимости). Дом не переезжает. |

Страницы монитора (один клик из дома):

| Страница | Путь |
|----------|------|
| Overview (слои + лемма) | [`apps/docs/bestiary/overview.mdx`](../../../apps/docs/bestiary/overview.mdx) |
| Улов `catch-silent-swallow-specimen` | [`apps/docs/bestiary/catch-silent-swallow.mdx`](../../../apps/docs/bestiary/catch-silent-swallow.mdx) |
| Ловушка `silent-empty-catch` | [`apps/docs/bestiary/trap-silent-empty-catch.mdx`](../../../apps/docs/bestiary/trap-silent-empty-catch.mdx) |

Внешний mintlify-community sync — только с ok владельца (вне W3).

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
  registry/              — BESTIARY_LIST + CATCH_LIST + TRAPS_LIST
  traps/                 — карточки ловушек (дока; W2)
  antipatterns/          — абстрактные шаблоны (W2; не pins кита)
  analysis/              — недельные / точечные прогоны (dated)
  specimens/<class>/     — намеренный плохой код (бетии); B2×4 + B3 echo
  cache/                 — сырые JSON прогонов (gitignore)
```

### Доп. реестры W2 (T16) — ≠ `BESTIARY_LIST`

| Носитель | Path | Роль |
|----------|------|------|
| Классы | `registry/BESTIARY_LIST.md` | справочник defectClass × specimen (overwrite audit) |
| **Улов** | `registry/CATCH_LIST.md` | пойманные примеры / гранулы (T1); **не** замена классов |
| **Ловушки** | `traps/` + `registry/TRAPS_LIST.md` | дока prompts+scripts (T3/T15) |
| **Шаблон** | `antipatterns/<id>.md` | абстракт «как паттерн» (T13); kit пинит ловушку, не шаблон (T18) |

Цепочка: шаблон → ловушка → улов. Specimen остаётся фикстурой (T2), не гранулой улова.

**Path decision (W2, ждать LGTM ozhegov):** индекс улова — `registry/CATCH_LIST.md`
(без отдельного `catch/` на старте); карточки ловушек — `traps/<id>.md`; шаблоны —
`antipatterns/<id>.md`. Массовый импорт `analysis/` → CATCH без ok владельца запрещён.

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `workshop.manifest.json` | Мастерская HOME_WORKSHOP | да |
| `registry/BESTIARY_LIST.md` | Канонический снимок классов × покрытие specimen (overwrite) | да |
| `registry/BESTIARY_LIST-YYYY-MM-DD.md` | Опциональный dated-архив | да |
| `registry/CATCH_LIST.md` | Доп. реестр улова (формат + строки); **≠** BESTIARY_LIST | да |
| `registry/TRAPS_LIST.md` | Индекс ловушек | да |
| `traps/<id>.md` | Карточка ловушки (prompts + scripts + kitPin) | да |
| `antipatterns/<id>.md` | Абстрактный шаблон антипаттерна | да |
| `specimens/<defectClass>/**` | Specimen’ы с пометкой `specimen:` / meta | да |
| `analysis/bestiary-run-YYYY-MM-DD.md` | Недельный отчёт (`yarn bestiary:weekly`, B4/#883); Summary всегда | да |
| `cache/**` | Сырой JSON (`lens-run --json`) | **нет** (gitignore) |

**Источник истины классов:** массив `BESTIARY` в `scripts/lib/lens-bestiary.mjs`.
Контейнер хранит производные снимки и бетий, не дублирует детекторы.
Улов и ловушки — hand-maintained доп. реестры (не overwrite от `bestiary:audit`).

## Retention

- Markdown `registry/` / `analysis/` / `specimens/` — коммитим.
- `cache/` — локальный scratch.

## Как вызвать агента

1. Указать: `docs/audit/bestiary/AGENT_PROMPT.md`.
2. Сценарии — в промпте (Inventory / Inventory-Catch / Trap-Doc / Specimen-Audit /
   Issue-Trap / Weekly-Report).
