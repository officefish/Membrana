# docs/audit

Контейнеры операторских аудитов Membrana (промпты + снимки + разборы).

| Контейнер | Назначение |
|-----------|------------|
| [`git/`](./git/) | Гигиена веток и git-аудиты (`AGENT_PROMPT.md`, registry, analysis) |

Текущий реестр веток живёт **внутри** контейнера: [`git/registry/branches-by-category.md`](./git/registry/branches-by-category.md) (dated-снимки рядом). Канон агента: [`git/AGENT_PROMPT.md`](./git/AGENT_PROMPT.md).

Каждый подкаталог — отдельный контракт: что можно писать, что коммитить, как звать агента.
