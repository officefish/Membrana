# Промпт: MCP repo bootstrap (фаза 0)

> **Task-промпт для агента-разработчика.** Размер: **S**.  
> Реестр: `mcp-repo-bootstrap` · Issue **#50**  
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)

---

## Контекст

Первая фаза rollout MCP: **безопасные артефакты в git** до установки на рабочих станциях. Ключи и billing **не блокируют** merge: в репозитории только Tier 0 и example-фрагменты.

**Связанные документы:** [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md), [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md), [`MCP_USAGE.md`](../MCP_USAGE.md), [`TZ_MCP_Servers_Membrana.md`](../TZ_MCP_Servers_Membrana.md).

**GitHub Issue:** [#50](https://github.com/officefish/Membrana/issues/50)

---

## Промпт целиком

### Кто ты

Координатор под **Vesnin** (Teamlead). Infra-задача: **не трогать** `packages/services/*` и #47 detector code.

### Что построить

1. `.gitignore` — `.gitnexus/`
2. `.cursor/mcp.json` — **только gitnexus** (Tier 0, без секретов)
3. `docs/mcp/tier0-workstation.example.json` — gitnexus + Git + Filesystem с `__MEMBRANA_ROOT__`
4. `docs/mcp/tier1-perplexity.fragment.json` — placeholder key
5. `docs/mcp/tier2-playwright.fragment.json`, `tier3-glyph.fragment.json`
6. `docs/claude_desktop_config.example.json` — Tier 0 only
7. `datasets/.gitkeep`
8. `scripts/verify-mcp-bootstrap.mjs` + `yarn mcp:verify-bootstrap`
9. Стратегия, rollout plan, MCP_USAGE с таблицей fallback

### Out of scope

- Реальные ключи в git
- Perplexity/Playwright/Glyph в committed `.cursor/mcp.json`
- Chrome MCP, mcp-firewall

### Definition of Done

- [ ] `yarn mcp:verify-bootstrap` зелёный
- [ ] `yarn lint` / CI без регрессий
- [ ] PR `Closes #50`
- [ ] `yarn task:archive mcp-repo-bootstrap`

---

## Заметки для человека

Workstation phases #51–#53 — локально, merge fragments по [`MCP_USAGE.md`](../MCP_USAGE.md).
