# Промпт: MCP — фаза B (Perplexity + Playwright)

> **Task-промпт**. Размер: **M**. Артефакт: **отчёт в Issue**, серверы active.
> Реестр: **`mcp-workstation-phase-b`**. План: [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md).
> **Зависимость:** `mcp-workstation-phase-a` закрыта.

---

## Контекст

Фаза B: отраслевый research и изолированный браузер. ТЗ §2, §6 (дополнение конфига), тесты 7.1–7.2.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TZ_MCP_Servers_Membrana_v3.md`](../TZ_MCP_Servers_Membrana_v3.md) | Этапы 2, 6 |
| [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) | Research ≠ замена `yarn analyzers:research:week` |
| [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) | §4 research |

**GitHub Issue:** [#52](https://github.com/officefish/Membrana/issues/52)

---

## Промпт целиком

### Кто ты

Исполнитель; координация **Vesnin** + **Dynin** (research).

### MCP при выполнении

| Сервер | Использовать |
|--------|--------------|
| Perplexity | да |
| Playwright | да |
| gitnexus / Git / Filesystem | уже из фазы A |
| Glyph | нет |

### Что сделать

1. **ТЗ §2** — ключ Perplexity `pplx-…` в менеджер паролей; платёжный метод привязан.
2. Добавить в локальный `mcp.json` / `claude_desktop_config.json` блоки `perplexity` и `playwright` по ТЗ §6.2 (ключ только в `env`, не в git).
3. Перезапуск Cursor / Claude Desktop.
4. Тесты **7.1** (публикации акустика БПЛА) и **7.2** (страница датасета + скриншот).
5. Отчёт в Issue: дата, версии, скрин списка MCP tools.

### Definition of Done

- [ ] Perplexity + Playwright **active**.
- [ ] Тесты 7.1, 7.2 пройдены.
- [ ] Ключ не в репозитории и не в чатах команды.
- [ ] LGTM Teamlead.

### Out of scope

- GlyphMCP (phase-c).
- Коммит локального конфига с ключами.

### Порядок ролей

1. **Teamlead** — допуск к API-расходам.
2. **Математик** — формулировка тестового запроса 7.1.
3. **Музыкант** — сценарий 7.2 (датасет).

---

## Заметки для постановщика

`yarn task:archive mcp-workstation-phase-b --notes "…"`

---

## Связь с дорожной картой

Research для эшелонов 1.A/1.B и [`WEEKLY_ANALYZERS_RESEARCH.md`](../WEEKLY_ANALYZERS_RESEARCH.md).
