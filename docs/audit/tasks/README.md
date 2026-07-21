# docs/audit/tasks — контейнер аудита реестра задач

Специальный контейнер, где агент **легально** хранит промпты, снимки декомпозиции
реестра задач и глубокие разборы категорий/ревизий. Зеркален по анатомии
[`docs/audit/git/`](../git/) (контейнер · кеш · реестр · инструменты · агент).

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).
Канон ревизии устаревших карточек: [`REGISTRY_AUDIT_PROMPT.md`](../../prompts/REGISTRY_AUDIT_PROMPT.md).

## Layout

```
docs/audit/tasks/
  README.md           — этот файл (контракт контейнера)
  AGENT_PROMPT.md     — setup агента (канон)
  registry/           — снимки декомпозиции реестра задач (коммитим markdown)
  analysis/           — глубокие разборы категорий и ревизий (коммитим markdown)
  cache/              — сырой JSON / промежуточные дампы (gitignore)
```

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `registry/TASKS_DECOMPOSE_LIST.md` | Канонический текущий реестр категорий (overwrite) | да |
| `registry/TASKS_DECOMPOSE_LIST-YYYY-MM-DD.md` | Опциональный dated-архив того же снимка | да |
| `analysis/category-N-attention-YYYY-MM-DD.md` | Deep analysis категории N | да |
| `analysis/registry-audit-YYYY-MM-DD.md` | Итог ревизии устаревших карточек | да |
| `cache/**` | Сырые JSON (`--json`), временные артефакты | **нет** (gitignore) |

Источник истины по задачам — `docs/tasks/registry.json` (движок LINEAR_TASKS_GEAR);
этот контейнер хранит только **производные** снимки и разборы, не сам реестр.

## Retention

- Markdown-снимки `registry/` и `analysis/` — **коммитим**: история аудита.
- Старые dated-файлы не удалять автоматически; при разрастании — архив по решению владельца.
- `cache/` — локальный scratch; не считать источником истины.

## Как вызвать агента

1. Открыть чат / сессию на ветке от `main` (или в worktree).
2. Приложить / указать: `docs/audit/tasks/AGENT_PROMPT.md`.
3. Сценарии:
   - **A:** «Собери реестр декомпозиции задач» → overwrite `registry/TASKS_DECOMPOSE_LIST.md`.
   - **B:** «Глубокий разбор категории N». **HARD GATE:** категория обязана быть в **текущем**
     сообщении, иначе STOP (см. промпт).
   - **C:** «Ревизия устаревших карточек» → канон `REGISTRY_AUDIT_PROMPT.md`,
     скилл `membrana-tasks-audit`; итог — `analysis/registry-audit-YYYY-MM-DD.md`.

Связанный tooling: `yarn tasks:decompose` (скилл `membrana-tasks-decompose`),
`yarn tasks:audit` (скилл `membrana-tasks-audit`), `yarn task:archive`.
