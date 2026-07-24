---
name: membrana-tasks-decompose
description: >-
  Декомпозиция активного реестра задач по оси (--by): yarn tasks:decompose —
  детерминированная раскладка (category/size/age/lead/kind/links) из конфига с
  ОБЯЗАТЕЛЬНЫМ markdown-табличным выводом. Use when user says разбей задачи,
  декомпозиция списка задач, обзор реестра по направлениям/размеру/возрасту,
  tasks:decompose --by. Do NOT use for ревизии устаревших карточек
  (membrana-tasks-audit), закрытия задачи (membrana-task-lifecycle) или списка
  без группировки (yarn task:list). Не verb мастерской docs/tasks (V2 wins).
---

# Membrana tasks decompose — декомпозиция списка задач

Инструмент: `yarn tasks:decompose` (`scripts/tasks-decompose.mjs`, логика в
`scripts/lib/tasks-decompose.mjs`). Конфиг осей:
`scripts/tasks-decompose.config.json`. Смежный канон:
[`REGISTRY_AUDIT_PROMPT.md`](../../../docs/prompts/REGISTRY_AUDIT_PROMPT.md),
паспорт [`LINEAR_TASKS_GEAR.md`](../../../docs/tasks/LINEAR_TASKS_GEAR.md).
Вердикт осей: M3 / #1059 · `docs/seanses/tasks-workshop-m3-axes-2026-07-23.md`.

**Контур / слот отчётов** (не дом заданий; V2 wins: `decompose` **вне** мастерской `docs/tasks`): [`docs/audit/tasks/`](../../../docs/audit/tasks/README.md) —
снимки пишутся `--report docs/audit/tasks/registry/TASKS_DECOMPOSE_LIST.md`
(overwrite; dated-копии рядом), сырой `--json` → `cache/` (gitignore). HARD GATE Scenario B —
[`AGENT_PROMPT.md`](../../../docs/audit/tasks/AGENT_PROMPT.md).

## Неподвижные правила

- **Одна ось за прогон.** `--by size --by age` или `--by size,age` — отказ.
  Ось по умолчанию — `category` (без `--by` поведение прежнее).
- **Набор осей:** `category` · `size` · `age` · `lead` · `kind` · `links`.
  `health` отложена до M4B (`tw-v5-validity`) — не вызывать.
- **Таблица — обязательная часть ответа.** Markdown (№ / категория / карточек /
  доля / примеры / итог) — показать владельцу как есть.
- **Параметры осей в конфиге, не в коде** (норма Р5). Менять раскладку =
  править `tasks-decompose.config.json`.
- **Порядок бакетов значим** — первая совпавшая забирает карточку.
- **«ВНЕ КАТЕГОРИЙ» — на любую ось.** Нет значения по оси / нет матча — отдельная
  строка, не молчание.
- **links** смотрит **наличие** полей (`githubIssue` / `linearId` / `promptPath`),
  не истинность связей (это валидность M4B).
- Read-only: скрипт не пишет ни в реестр, ни в конфиг.

## Workflow

1. `yarn tasks:decompose` — ось `category`. Или `yarn tasks:decompose --by size`
   (и др.). Флаги: `--full`, `--examples N`, `--json`, `--config <path>`,
   `--report <file>`.
2. Показать таблицу владельцу + 2–4 наблюдения по долям.
3. Если есть «ВНЕ КАТЕГОРИЙ» — предложить паттерн/корзину в конфиг, перегнать.
4. Просьба «разбей по-другому» — одноразовый `--config` или правка секции `axes`
   в боевом конфиге (после ok владельца).

## Сопровождение конфига

- Пересматривать после крупных регистраций серий (новый эпик = новый префикс).
- Категорий держать 5–9: меньше — нет картины, больше — таблица не читается.
- При споре о принадлежности карточки решает владелец; фиксация — паттерном
  в конфиге, а не исключением в коде.