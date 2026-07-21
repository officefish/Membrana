# docs/audit/git — контейнер git-аудита

Специальный контейнер, где агент **легально** хранит промпты, реестры веток и глубокие разборы по гигиене git-репозитория Membrana.

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).

## Layout

```
docs/audit/git/
  README.md           — этот файл (контракт контейнера)
  AGENT_PROMPT.md     — setup агента (канон)
  registry/           — снимки декомпозиции веток (коммитим markdown)
  analysis/           — глубокие разборы категорий (коммитим markdown)
  cache/              — сырой JSON / промежуточные дампы (gitignore)
```

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `registry/branches-by-category-YYYY-MM-DD.md` | Реестр 7 категорий | да (dated snapshot) |
| `registry/LATEST.md` | Указатель на актуальный реестр (overwrite content) | да |
| `registry/*.json` (опционально) | Machine-readable twin реестра | лучше в `cache/` |
| `analysis/category-N-attention-YYYY-MM-DD.md` | Deep analysis категории N | да |
| `cache/**` | Сырые JSON, churn dumps, временные артефакты | **нет** (gitignore) |

## Retention

- Markdown-снимки `registry/` и `analysis/` — **коммитим**: полезны как история аудита (как `docs/reports/night-triage/`).
- Старые dated-файлы не удалять автоматически; при разрастании — архивировать по решению владельца.
- `cache/` — локальный scratch; не считать источником истины.

## Как вызвать агента

1. Открыть чат / сессию на ветке от `main` (или в worktree).
2. Приложить / указать: `docs/audit/git/AGENT_PROMPT.md`.
3. Сценарии:
   - **A:** «Собери реестр веток по категориям» → пишет `registry/…` + `LATEST.md`.
   - **B:** «Глубокий разбор категории N» → читает `registry/LATEST.md`, пишет `analysis/…`.

Связанный tooling: `yarn repo:branches:decompose`, скилл `membrana-branch-decompose`.
Указатель в процессе: [`docs/CONTRIBUTING.md`](../../CONTRIBUTING.md) → «Гигиена веток».
