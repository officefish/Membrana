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
| **Кит** | Именованный набор скриптов/точек входа под задачу (контракт манифеста — **pl-r3**, не изобретать параллельный) |
| **Ядро (core) kits** | GitHub Releases (+ Actions); runtime cron — office. Код кита остаётся в `scripts/` |

## Соответствие паттерну GROUP_CONTAINERIZATION

1. ✅ Выделенный каталог = сам `scripts/`; артефакты управления группой не живут вне него.
2. ✅ README-контракт с таблицей «что писать / в git?» (ниже).
3. ✅ Overwrite-реестр `registry/SCRIPTS_LIST.md` — `yarn scripts:registry --report`.
4. ✅ `cache/` под gitignore (этот файл + `.gitkeep`).
5. ⚠ Инструменты пишут в контейнер сами (`--report`) — **фаза S2** (S1 уже пишет через `scripts:registry --report`; S2 — выровнять с `tooling:overview`).
6. ✅ `AGENT_PROMPT.md` со сценариями; у опасных — HARD GATE.
7. ✅ Массовые мутации (массовое удаление/переименование скриптов) — только по слову владельца.
8. ⚠ Провода в `AGENTS.md` / скиллы — **фаза S4** (минимальная отсылка допустима после S0).

**Граница с процедурным слоем:** процедуры живут в `docs/procedures/` (эпик `procedural-layer-impl`).
Слой scripts ← вызывается процедурами; направление слоёв и контракт kit-manifest —
карточка `pl-r3-boundary` (#784). Фаза **S3** не стартует контракт кита с нуля.

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

1. Ветка от `main` (или worktree). Сверить соседей: `yarn neighbors` (особенно `pl-r3-boundary`).
2. Указать: `scripts/AGENT_PROMPT.md`.
3. Сценарии — в AGENT_PROMPT.

Связанный tooling: `yarn scripts:registry --report` · `yarn tooling:overview` · `yarn test:scripts`.
Указатель процесса: эпик `scripts-boundary-container`, спринт OPEN в `docs/day-sprint/`.
