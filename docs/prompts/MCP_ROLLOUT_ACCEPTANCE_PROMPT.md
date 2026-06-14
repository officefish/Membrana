# Промпт: MCP rollout acceptance (#54)

> **Task-промпт.** Размер: **S**. Реестр: `mcp-rollout-acceptance` · Issue **#54**  
> **Зависимости:** phase A + B archived; phase C recommended.

---

## Контекст

Финальный gate: MCP **не обязан** включать все Tier 1–3 — достаточно Tier 0 + documented skips.

Стратегия §7: [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md).

---

## Промпт целиком

### Композитный чеклист

1. `yarn mcp:verify-bootstrap` — зелёный (CI).
2. Tier 0: gitnexus active на ≥1 станции.
3. Tier 1–3: для каждого — **pass** или **skip + fallback** (таблица в комментарии #54):

| Сервер | Status | Fallback if skipped |
|--------|--------|---------------------|
| Perplexity | pass/skip | MCP_USAGE § Tier 1 |
| Playwright | pass/skip | MCP_USAGE § Tier 2 |
| Glyph | pass/skip | MCP_USAGE § Tier 3 |

4. Эталонный config (плейсхолдеры) в vault команды / password manager.
5. Запись в standup или `docs/archive/daily-day/`.

### DoD

- [ ] Issue #54 комментарий с таблицей
- [ ] `mcp-repo-bootstrap` … `mcp-workstation-phase-c` archived
- [ ] `yarn task:archive mcp-rollout-acceptance`
