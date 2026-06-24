# Промпт: MCP workstation — фаза B (#52)

> **Task-промпт.** Размер: **S**. Реестр: `mcp-workstation-phase-b` · Issue **#52**  
> **Зависимость:** `mcp-workstation-phase-a` archived.

---

## Контекст

Research (Perplexity) и изолированный браузер (Playwright). **Оба опциональны** — отсутствие ключа не блокирует команду.

Фрагменты: [`tier1-perplexity`](../mcp/tier1-perplexity.fragment.json), [`tier2-playwright`](../mcp/tier2-playwright.fragment.json).  
Fallback: [`MCP_USAGE.md`](../MCP_USAGE.md).

---

## Промпт целиком

### Perplexity (опционально)

1. Получить `pplx-…` (ТЗ §2) — billing личный.
2. Добавить `PERPLEXITY_API_KEY=pplx-…` в корневой `.env` (не в git).
3. `yarn mcp:phase-b:install` — merge tier1+tier2 в `~/.cursor/mcp.json`.
4. Перезапустить Cursor; smoke: «MCP news last 7 days» (ТЗ §6.1).

**Skip:** нет ключа / 403 → удалить блок perplexity; research вручную + `yarn analyzers:research:week` (если есть Anthropic key).

### Playwright (опционально)

1. Merge tier2 fragment локально.
2. Smoke: example.com title + screenshot (ТЗ §6.2).

**Skip:** Chromium не скачался → ручной браузер / Cursor browser MCP.

### DoD

- [ ] Perplexity smoke **или** documented skip
- [ ] Playwright smoke **или** documented skip
- [ ] `yarn task:archive mcp-workstation-phase-b`
