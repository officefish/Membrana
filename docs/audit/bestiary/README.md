# docs/audit/bestiary — контейнер бестиария антипаттернов

Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода).
Реализация [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md).
Эпик: `bestiary-container` (#878) · инсайт:
[`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md).

**Лемма:** контейнер обязан **ловить** бетий в `specimens/` своими детекторами.
Класс без specimen’а = украшение. Аудитор не молчун: `not-run` ≠ `clean`.

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).

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
6. ✅ `AGENT_PROMPT.md`; Scenario Specimen-Audit с HARD GATE на класс.
7. ✅ Массовое «лечение» находок запрещено (#533 — линза находит, не чинит); правки кода — отдельные задачи.
8. ✅ Провода: `docs/audit/README.md`, `AGENTS.md`, эпик OPEN; скилл — follow-up при потребности.

## Layout

```
docs/audit/bestiary/
  README.md              — этот файл
  AGENT_PROMPT.md        — setup агента
  registry/              — BESTIARY_LIST.md (производный overwrite)
  analysis/              — недельные / точечные прогоны (dated)
  specimens/<class>/     — намеренный плохой код (бетии); наполнение — B2
  cache/                 — сырые JSON прогонов (gitignore)
```

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `registry/BESTIARY_LIST.md` | Канонический снимок классов × покрытие specimen (overwrite) | да |
| `registry/BESTIARY_LIST-YYYY-MM-DD.md` | Опциональный dated-архив | да |
| `specimens/<defectClass>/**` | Specimen’ы с пометкой `specimen:` / meta | да |
| `analysis/bestiary-run-YYYY-MM-DD.md` | Отчёт прогона (B4+) | да |
| `cache/**` | Сырой JSON (`lens-run --json`) | **нет** (gitignore) |

**Источник истины классов:** массив `BESTIARY` в `scripts/lib/lens-bestiary.mjs`.
Контейнер хранит производные снимки и бетий, не дублирует детекторы.

## Retention

- Markdown `registry/` / `analysis/` / `specimens/` — коммитим.
- `cache/` — локальный scratch.

## Как вызвать агента

1. Указать: `docs/audit/bestiary/AGENT_PROMPT.md`.
2. Сценарии — в промпте (Inventory / Specimen-Audit / Weekly-Report).
