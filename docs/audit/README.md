# docs/audit

Контейнеры операторских аудитов Membrana (промпты + снимки + разборы).

| Контейнер | Назначение |
|-----------|------------|
| [`git/`](./git/) | Гигиена веток и git-аудиты (`AGENT_PROMPT.md`, registry, analysis) |
| [`tasks/`](./tasks/) | Аудит реестра задач: декомпозиция + ревизия устаревших (`AGENT_PROMPT.md`, registry, analysis) |

Текущий реестр веток живёт **внутри** контейнера: [`git/registry/BRANCHES_DECOMPOSE_LIST.md`](./git/registry/BRANCHES_DECOMPOSE_LIST.md) (опциональные dated-снимки рядом). Канон агента: [`git/AGENT_PROMPT.md`](./git/AGENT_PROMPT.md).
Текущий снимок декомпозиции задач: [`tasks/registry/TASKS_DECOMPOSE_LIST.md`](./tasks/registry/TASKS_DECOMPOSE_LIST.md). Канон агента: [`tasks/AGENT_PROMPT.md`](./tasks/AGENT_PROMPT.md).

Каждый подкаталог — отдельный контракт: что можно писать, что коммитить, как звать агента.
