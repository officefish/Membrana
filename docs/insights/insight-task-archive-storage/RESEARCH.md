# Research: Хранилище архива закрытых задач

> Источник: model knowledge (manual) · 2026-06-28
> Perplexity недоступен; использован базовый корпус знаний модели.

---

## Q1 — Landscape

**Запрос:** append-only log vs relational DB for task/event archives — industry patterns 2024–2026

**Выжимка:**

- **Event sourcing + CQRS** — устоявшийся паттерн: события пишутся в append-only log (EventStore, Kafka, JSONL), read-модель = проекция. Именно это предлагает бриф.
- **Git** сам является append-only log (history) — и является source of truth для кода. Хранить JSONL рядом с кодом = та же эпистемология.
- **Linear** (source of truth для задач в Membrana) использует Postgres + event log внутри; но Linear — продукт с тысячами конкурентных пользователей. Соло-разработка ≠ Linear.
- **SQLite**: single-writer, отлично до ~10 ГБ и нескольких тысяч RPS. Cursor сам хранит состояние в SQLite. Правильный следующий шаг после JSONL при появлении конкурентности.
- **DuckDB**: аналитика прямо по JSONL/Parquet без сервера. `SELECT * FROM read_json('archive.jsonl')` — работает с первой строки. Заменяет OLAP-Postgres для закрытых задач.
- **Тренд**: "SQLite is underrated" — Turso, Litestream; компании масштабируют SQLite до продакшн, потому что конкурентная запись редко нужна раньше, чем кажется.

**Импликация:** JSONL → SQLite → DuckDB-over-JSONL — правильная лестница. Postgres — для другой задачи.

---

## Q2 — Fit (Membrana)

**Запрос:** fit с registry.json, вечерним ритуалом, VPS RAM constraint, git-versionability

**Выжимка:**

- `registry.json` остаётся малым (только открытые задачи) — read-оптимизированная проекция, обновляется редко.
- `archive.jsonl` рядом с `registry.json` в `docs/tasks/` — git diff показывает каждое закрытие; human-readable; не требует сервера.
- `yarn task:archive` уже существует — нужно лишь добавить append в JSONL; никаких новых зависимостей.
- VPS: `background-office` уже несёт Postgres для NestJS. Добавлять второй инстанс под 5–50 строк/месяц архива — непропорционально.
- DuckDB: `npm install duckdb` — ~5 МБ, не требует server process; аналитика по `archive.jsonl` возможна уже сейчас.

---

## Q3 — Risk

**Запрос:** JSONL corruption, scaling limits, analytics needs, concurrent write risks

**Выжимка:**

| Риск | Оценка | Митигация |
|------|--------|-----------|
| Partial write при сбое | Низкий | write-to-tmp → atomic rename; одна строка = одна задача → частичный write = один сбойный record |
| Scaling JSONL | Очень низкий | 1–3 задачи/день → 1–5 KB/день; GB через 500+ лет |
| Аналитика (время закрытия, epic-нагрузка) | Средний | DuckDB прямо по JSONL: `read_json_auto('archive.jsonl')` без сервера |
| Конкурентная запись | Нет сейчас | один процесс (ritual:evening); триггер — появление второго процесса |
| Потеря git-версионируемости | Нет при JSONL | JSONL в репо = diff-able; при Postgres это свойство теряется |

---

*Источник: model knowledge (manual) · Perplexity fallback не выполнялся*
