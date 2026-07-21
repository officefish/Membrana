# scripts/ — контейнер скриптов монорепо

Единственный дом группы «скрипты и yarn-обвязка ритуала». Реализация паттерна
[`GROUP_CONTAINERIZATION`](../docs/patterns/GROUP_CONTAINERIZATION.md) **внутри**
уже существующего каталога `scripts/` — **не** заводить второй дом
(`docs/audit/scripts/` и т.п.).

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).
Эпик: `scripts-boundary-container` · фазы `sbc-s0`…`sbc-s4`.

## Термины (чтобы не поплыли)

| Лемма | Значение |
|-------|----------|
| **Дом группы** | Каталог `scripts/` — здесь лежат исполняемые `.mjs` и органы контейнера |
| **Единица учёта скрипта** | Имя yarn-скрипта в корневом `package.json` и/или путь файла под `scripts/` |
| **Реестр** | Производный снимок «текущего» состава группы (`registry/`), не источник истины |
| **Источник истины** | Файловая система `scripts/**` + записи `"scripts"` в корневом `package.json` |
| **Кит** | Именованный набор точек входа под задачу; **слой** `kits/` в [`layer-rules.json`](../docs/procedures/layer-rules.json) (спит до #761). Код движков — плоский `scripts/` |
| **Кит-манифест** | Контракт **только** из Р3 — см. [§ Киты](#киты--канон-р3-не-второй-схемный-остров) ниже. Здесь JSON-схемы кита **нет** |
| **kitVersion** | Поле `MANIFEST.json` процедуры: пин набора (`null` пока китов нет). Валидирует `validateProcedure` |
| **Ядро (core) kits** | GitHub Releases (+ Actions) — раздача пина; runtime cron — office. Версия единицы — [`PINNED_SUBGRAPH_VERSIONING`](../docs/patterns/PINNED_SUBGRAPH_VERSIONING.md) |

## Соответствие паттерну GROUP_CONTAINERIZATION

1. ✅ Выделенный каталог = сам `scripts/`; артефакты управления группой не живут вне него.
2. ✅ README-контракт с таблицей «что писать / в git?» (ниже).
3. ✅ Overwrite-реестр `registry/SCRIPTS_LIST.md` — `yarn scripts:registry --report`.
4. ✅ `cache/` под gitignore (этот файл + `.gitkeep`).
5. ✅ Инструменты пишут в контейнер сами: `yarn scripts:registry --report` ≡ `yarn tooling:overview --report`.
6. ✅ `AGENT_PROMPT.md` со сценариями; у опасных — HARD GATE.
7. ✅ Массовые мутации (массовое удаление/переименование скриптов) — только по слову владельца.
8. ✅ Провода: `AGENTS.md` (таблица + § Scripts container + грабля «второй дом»),
   [`docs/audit/README.md`](../docs/audit/README.md), [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md)
   («Гигиена веток» / контейнеры), указатель в [`.cursor/skills/README.md`](../.cursor/skills/README.md).

**Граница с процедурным слоем:** процедуры живут в `docs/procedures/` (эпик `procedural-layer-impl`).
Слой scripts ← вызывается процедурами; направление слоёв — `yarn check:layer-direction`
([`layer-rules.json`](../docs/procedures/layer-rules.json), PR #808 / архив `pl-r3-boundary`).

## Киты — канон Р3 (не второй схемный остров)

Канон контракта кит-манифеста зафиксирован процедурным слоем (Р3, #784 / PR #808),
не контейнером `scripts/`:

| Адрес | Что |
|-------|-----|
| [`docs/procedures/README.md`](../docs/procedures/README.md) § «Граница слоёв и киты» | Контракт: кит без манифеста / с битыми ссылками → машинный BLOCK на ревью; манифест — главный diffable-артефакт |
| [`docs/procedures/layer-rules.json`](../docs/procedures/layer-rules.json) | Ранг слоя `кит` (`kits/`); ребро процедура→кит через `MANIFEST.json` `kitVersion` |
| [`docs/procedures/*/MANIFEST.json`](../docs/procedures/ritual-evening/MANIFEST.json) | Потребитель: `kitVersion` (`null` до появления китов) |
| [`PINNED_SUBGRAPH_VERSIONING`](../docs/patterns/PINNED_SUBGRAPH_VERSIONING.md) | Как версионировать кит (#761): подграф путь→SHA, не копии |
| [`attribution/`](../docs/procedures/attribution/README.md) | Кандидат в первый кит (механизм парсера — T9, ещё не код) |

**Запрещено в `scripts/`:** заводить `kits.schema.json` / параллельный формат манифеста
«временно». Пока слой `kits/` спит (#761) — код остаётся плоским здесь; пин с процедуры
через `kitVersion`. Разбор выравнивания: [`analysis/kits-align-pl-r3-2026-07-21.md`](./analysis/kits-align-pl-r3-2026-07-21.md).

## Layout

```
scripts/
  README.md           — этот файл (контракт контейнера)
  AGENT_PROMPT.md     — setup агента (канон)
  registry/           — снимки состава группы (коммитим markdown; S1+)
  analysis/           — глубокие разборы (коммитим markdown; по запросу)
  cache/              — сырой JSON / промежуточные дампы (gitignore)
  lib/                — общие модули скриптов
  *.mjs               — исполняемые скрипты (источник истины кода)
```

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `*.mjs`, `lib/**` | Код скриптов | да |
| `registry/SCRIPTS_LIST.md` | Канонический текущий реестр (overwrite, S1+) | да |
| `registry/SCRIPTS_LIST-YYYY-MM-DD.md` | Опциональный dated-архив | да |
| `analysis/*.md` | Deep analysis | да |
| `cache/**` | Сырые JSON, дампы tooling:overview | **нет** (gitignore) |

## Retention

- Markdown в `registry/` и `analysis/` — коммитим как историю инвентаря/разборов.
- `cache/` — локальный scratch; не источник истины.
- Код `.mjs` — живёт здесь всегда; контейнер **не** переносит скрипты в docs.

## Как вызвать агента

1. Ветка от `main` (или worktree). Сверить соседей: `yarn neighbors`.
2. Указать: [`scripts/AGENT_PROMPT.md`](./AGENT_PROMPT.md) (тот же entry из `AGENTS.md`).
3. Сценарии — в AGENT_PROMPT.

Связанный tooling: `yarn scripts:registry --report` · `yarn tooling:overview [--report]` · `yarn test:scripts`.
Операторский вход: `AGENTS.md` → «Scripts container». Спринт: `docs/day-sprint/scripts-boundary-container-2026-07-21/`.
