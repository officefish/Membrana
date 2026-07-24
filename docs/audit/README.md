# docs/audit — плоскость отчётов (report-plane)

**Двумерный контейнер отчётов**, не склад предметных групп.

| Ось | Смысл |
|-----|--------|
| **Предметный слот** | о какой группе отчёт: git / tasks / bestiary / llm-calls / … |
| **Орган снимка** | registry · analysis · cache · AGENT_PROMPT (форма `GROUP_CONTAINERIZATION`) |

Предметные дома живут **снаружи** (задания — [`docs/tasks/`](../tasks/); истина
карточек — `docs/tasks/registry.json`). Слот [`tasks/`](./tasks/) здесь — только
**отчёты про** реестр (декомпозиция, ревизии), `role: derivative`.

| Слот | Назначение |
|------|------------|
| [`git/`](./git/) | Отчёты / гигиена веток (`AGENT_PROMPT.md`, registry, analysis) |
| [`tasks/`](./tasks/) | Отчёты про реестр задач (не второй `docs/tasks`) |
| [`bestiary/`](./bestiary/) | Бестиарий антипаттернов + specimens |
| [`llm-calls/`](./llm-calls/) | Доказательный минимум LLM-вызовов процедур |

Текущий реестр веток: [`git/registry/BRANCHES_DECOMPOSE_LIST.md`](./git/registry/BRANCHES_DECOMPOSE_LIST.md). Канон агента: [`git/AGENT_PROMPT.md`](./git/AGENT_PROMPT.md).
Текущий снимок декомпозиции задач: [`tasks/registry/TASKS_DECOMPOSE_LIST.md`](./tasks/registry/TASKS_DECOMPOSE_LIST.md). Канон агента: [`tasks/AGENT_PROMPT.md`](./tasks/AGENT_PROMPT.md).
Текущий реестр бестиария: [`bestiary/registry/BESTIARY_LIST.md`](./bestiary/registry/BESTIARY_LIST.md). Канон агента: [`bestiary/AGENT_PROMPT.md`](./bestiary/AGENT_PROMPT.md).

**Не здесь:** контейнер группы скриптов — один дом [`scripts/`](../../scripts/README.md)
(entry [`AGENT_PROMPT.md`](../../scripts/AGENT_PROMPT.md)). Не плодить `docs/audit/scripts/`.

Индекс контейнеров (domain / report-plane / meta) — [`docs/tooling-atlas/`](../tooling-atlas/).
Общая форма слотов — [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md);
каждый слот несёт чеклист в своём README. Модель плоскости — спринт
[`atlas-report-plane`](../prompts/ATLAS_REPORT_PLANE_PROMPT.md) (#1097).
