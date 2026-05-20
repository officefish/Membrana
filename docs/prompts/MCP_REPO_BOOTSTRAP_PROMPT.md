# Промпт: MCP — bootstrap артефактов в репозитории

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер: **M**.
> Ожидаемый артефакт: **1 PR** — шаблоны MCP-конфига, `.gitignore`, scaffold датасетов.
> Реестр: `id` = **`mcp-repo-bootstrap`** в [`docs/tasks/registry.json`](../tasks/registry.json).
> План цепочки: [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md).

---

## Контекст

Политика MCP принята ([`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md)). Перед установкой на рабочих станциях в git должны появиться **безопасные** шаблоны (без API-ключей), игнор индекса gitnexus и согласованная структура `datasets/`.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) | Политика, состав серверов |
| [`TZ_MCP_Servers_Membrana_v3.md`](../TZ_MCP_Servers_Membrana_v3.md) | Формат JSON-конфига |
| [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md) | Порядок задач 1–5 |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | PR, не коммитить секреты |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

**GitHub Issue:** [#50](https://github.com/officefish/Membrana/issues/50)

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор** под **Vesnin** (Teamlead). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

### MCP при выполнении

| Сервер | Использовать | Не использовать |
|--------|--------------|-----------------|
| gitnexus | да (проверка путей) | — |
| Git MCP | да | — |
| Остальные | нет | — |

### Что построить

1. **`.gitignore`** — строка `.gitnexus/` (если ещё нет).
2. **`.cursor/mcp.json`** — шаблон для Cursor:
   - `gitnexus`: `command` `gitnexus`, `args` `["mcp"]` (глобальный бинарь, не `npx`);
   - `git`: `uvx` + `mcp-server-git` + `--repository` с плейсхолдером `C:\\path\\to\\Membrana`;
   - `filesystem`: `@modelcontextprotocol/server-filesystem` + корень репо + `datasets` (плейсхолдеры путей);
   - **без** `env` с ключами; блоки `perplexity` / `glyph` — закомментированы или в отдельном example с пометкой «подключить в phase-b/c».
3. **`docs/claude_desktop_config.example.json`** — полный эталон шести серверов из ТЗ §6.2 с плейсхолдерами `ЗАМЕНИТЬ_*` и комментарием в README.
4. **`datasets/.gitkeep`** (или `docs/DATASET.md` уточнение внешнего пути) — каталог для Filesystem MCP.
5. **Корневой `README.md`** — убедиться, что раздел «MCP-окружение» ссылается на стратегию и example-файл.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Конфиг Cursor | `.cursor/mcp.json` | Только публичный шаблон |
| Пример Desktop | `docs/claude_desktop_config.example.json` | Плейсхолдеры, не секреты |
| Датасеты | `datasets/` | Пустой scaffold в git |
| Индекс gitnexus | `.gitnexus/` | **Не** коммитить |

**Запрещено:**

- Реальные `PERPLEXITY_API_KEY`, `GLYPHMCP_API_TOKEN` в любых файлах репо.
- Chrome MCP в шаблонах.
- Монтирование `$HOME` в Filesystem args.

### Definition of Done

- [ ] Все пункты «Что построить» выполнены.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (или затронутые пакеты — N/A для docs-only).
- [ ] PR с `Closes #N`; LGTM Teamlead.
- [ ] В Issue — список изменённых путей.

### Out of scope

- Установка Node/uv на машинах (задача `mcp-workstation-phase-a`).
- Получение API-ключей (phase-b/c).
- Приёмочные тесты 7.x.

### Порядок ролей

1. **Teamlead** — форма решения, LGTM.
2. **Структурщик** — структура путей в JSON, согласованность с monorepo.

### Формат ответа координатора

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: —
[Музыкант]: —
[Верстальщик]: —

Итоговый артефакт: PR с шаблонами MCP
Definition of Done: см. чеклист выше
```

---

## Заметки для человека-постановщика

1. Issue `wish` по [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md).
2. `registry.json`: `mcp-repo-bootstrap`, `status: active`.
3. После merge: `yarn task:archive mcp-repo-bootstrap --notes "PR #…"`.

### Проверка после PR

```bash
git grep -i "pplx-" -- ':!docs/claude_desktop_config.example.json' || true
git grep -i "GLYPHMCP_API_TOKEN" -- ':!docs/claude_desktop_config.example.json' || true
test -f docs/claude_desktop_config.example.json
```

---

## Связь с дорожной картой

Инфраструктура агента для stage-gate и семейства детекторов — [`WHITE_PAPER.md`](../WHITE_PAPER.md) §8, [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §8 фаза A.
