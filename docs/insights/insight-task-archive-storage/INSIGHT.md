# INSIGHT: Хранилище архива закрытых задач — append-only log vs Postgres

| Поле | Значение |
|------|----------|
| **ID** | `insight-task-archive-storage` |
| **Статус** | ratified |
| **Источник** | consilium |
| **Создан** | 2026-06-28 |
| **Горизонт** | week |
| **Связанный бриф** | `docs/INSIGHT_2026-06-28_TASK_ARCHIVE_STORAGE_1.md` |

---

## Проблема / наблюдение

Реестр активных задач (`registry.json`) должен оставаться лёгким по мере роста истории
закрытых задач. Вопрос: переносить ли холодный архив в Postgres на `background-office`?

## Гипотеза

Разнесение горячего и холодного хранилища верно (CQRS поверх append-only log), но
Postgres как форма холодного хранилища избыточен: он решает проблему конкурентной
записи, которой у последовательного вечернего архивирования нет. Целевая форма —
`archive.jsonl` (append-only) + генерируемый индекс, с явным stage-gate на переход.

## Решение 2026-06-28 (superseded)

**Лестница хранилищ (останавливаться на первой достаточной ступени):**

1. `registry.json` — только открытые задачи (горячий путь)
2. `archive.jsonl` — append-only, одна задача = одна строка (холодный источник истины)
3. Генерируемый индекс — плоский JSON → SQLite при росте
4. Postgres — только при конкурентной записи нескольких процессов или объёме ГБ+

**Триггеры перехода на Postgres:** `database is locked` чаще раза в неделю; второй
параллельный пишущий процесс; объём архива пробивает единицы ГБ.

## Scope

- **In scope:** `archive.jsonl` рядом с `registry.json`; регламент вечернего архивирования; DuckDB для аналитики поверх JSONL (без отдельного сервиса).
- **Out of scope:** Postgres на `background-office` до выполнения триггеров; tamper-evidence хеш-цепочка (нет недоверенных сторон в контуре).

## Ревизия 2026-07-30 (ратифицировано владельцем)

После handoff-а и митинга по `PR #1519` целевой контур изменён:

1. Канонический холодный архив закрытых задач живёт в `background-office` MongoDB.
2. Запись идёт только через Archive Notary, append-only и идемпотентно по `task_closure:<taskId>`.
3. Репозиторий не является steady-state SoT; в нём остаются только компактные checkpoints/exports и документы восстановления.
4. `docs/tasks/archive/**` — legacy evidence и мигрируется только через reviewed manifest.

Реализация начата в `packages/background-office/src/modules/task-archive/**`, контракт описан в
`docs/tasks/cold-archive/CONTRACT.md`.

## Связи

- `docs/INSIGHT_2026-06-28_TASK_ARCHIVE_STORAGE_1.md` — полный бриф с обоснованием и внешними источниками
- `docs/tasks/registry.json` — активный реестр (горячий путь)
- `docs/prompts/TASK_CLOSURE_REVIEW_REGULATION.md` — регламент закрытия задач
- `docs/tasks/cold-archive/CONTRACT.md` — новый cold-store контракт
