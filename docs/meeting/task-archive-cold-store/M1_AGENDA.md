# M1 — Source of truth для `task-archive-cold-store`

**P2 —** Что является каноническим source of truth холодного архива закрытых задач:
`background-office`/MongoDB append-only collection, repo JSONL, или гибрид, где сервер
хранит канонические records, а git хранит только проверяемый checkpoint; какие операции
являются append-only каноном, какие — производными представлениями, и при каких условиях
repo снова становится единственным источником истины? Вердикт обязан выбрать ровно одну
модель SoT, назвать границу append-only/derived, запретить подмену cold archive mutable
task table, и перечислить полный список посылок. **Не решать Q2 checkpoint fields, Q3
evidence fields, Q5 write path, Q6 migration и Q7 insight lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже ратифицировано владельцем

M0 установил и владелец ратифицировал порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 соответствует Q1 из M0: **Source of truth**.

## Границы вопроса

Нужно решить только:

- канонический дом закрытой задачи после архивации;
- является ли MongoDB collection в `background-office` SoT или только mirror/cache;
- является ли repo JSONL SoT или только fallback/export/checkpoint carrier;
- какие операции должны быть append-only по смыслу;
- какие материалы допускаются только как derived views или recovery exports;
- когда repo может временно/аварийно стать SoT.

Не решать здесь:

- форму repo checkpoint и поля ledger/manifest;
- полный evidence contract архивной записи;
- конкретный writer/idempotency key/API;
- migration map старых markdown/archive/registry;
- статус L/O у `insight-task-archive-storage`.

## Входы

- Владелец: холодный архив не обязан лежать в репозитории; возможен `background-office`
  на `mmbrn.tech` + MongoDB; в repo может оставаться небольшой hash/checkpoint-слепок.
- `docs/insights/insight-task-archive-storage/INSIGHT.md`: прежняя версия предлагала
  `docs/tasks/archive.jsonl` как cold SoT, чтобы разгрузить `registry.json`.
- `docs/insights/insight-task-archive-storage/REVIEW.md`: требуются atomic write,
  `timestamp`, `epic_id`; server API тогда считался избыточным.
- `docs/BACKGROUND_SERVERS.md`: Linear/Claude остаются domain `background-office`,
  media не является домом для этого архива.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| SoT model | one of: office-mongo / repo-jsonl / hybrid |
| Canonical append-only operations | ... |
| Derived views | ... |
| Repo fallback condition | ... |
| Forbidden interpretation | ... |

После таблицы — обязательная секция **Список посылок**.
