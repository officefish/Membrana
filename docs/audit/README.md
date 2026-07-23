# docs/audit

Контейнеры операторских аудитов Membrana (промпты + снимки + разборы).

| Контейнер | Назначение |
|-----------|------------|
| [`git/`](./git/) | Гигиена веток и git-аудиты (`AGENT_PROMPT.md`, registry, analysis) |
| [`tasks/`](./tasks/) | Аудит реестра задач: декомпозиция + ревизия устаревших (`AGENT_PROMPT.md`, registry, analysis) |
| [`bestiary/`](./bestiary/) | Бестиарий антипаттернов + specimens (`AGENT_PROMPT.md`, registry, analysis) |
| [`llm-calls/`](./llm-calls/) | Доказательный минимум LLM-вызовов процедур (`AGENT_PROMPT.md`, registry, specimens) |

Текущий реестр веток живёт **внутри** контейнера: [`git/registry/BRANCHES_DECOMPOSE_LIST.md`](./git/registry/BRANCHES_DECOMPOSE_LIST.md) (опциональные dated-снимки рядом). Канон агента: [`git/AGENT_PROMPT.md`](./git/AGENT_PROMPT.md).
Текущий снимок декомпозиции задач: [`tasks/registry/TASKS_DECOMPOSE_LIST.md`](./tasks/registry/TASKS_DECOMPOSE_LIST.md). Канон агента: [`tasks/AGENT_PROMPT.md`](./tasks/AGENT_PROMPT.md).
Текущий реестр бестиария: [`bestiary/registry/BESTIARY_LIST.md`](./bestiary/registry/BESTIARY_LIST.md). Канон агента: [`bestiary/AGENT_PROMPT.md`](./bestiary/AGENT_PROMPT.md).

**Не здесь:** контейнер группы скриптов — один дом [`scripts/`](../../scripts/README.md)
(entry [`AGENT_PROMPT.md`](../../scripts/AGENT_PROMPT.md)). Не плодить `docs/audit/scripts/`.

Каждый подкаталог — отдельный контракт: что можно писать, что коммитить, как звать агента.
Общая форма контейнеров — паттерн [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md);
каждый контейнер несёт чеклист соответствия в своём README.
