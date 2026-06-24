# MCP Phase B — отчёт workstation

> Сгенерировано: 2026-06-12T06:37:14.841Z (`yarn mcp:phase-b`)
> Issue: [#52](https://github.com/officefish/Membrana/issues/52) · промпт: `MCP_WORKSTATION_PHASE_B_PROMPT.md`

## Acceptance (#52)

| Критерий | Статус |
|----------|--------|
| PERPLEXITY_API_KEY в .env | ✅ |
| perplexity в MCP config | ✅ |
| playwright в MCP config | ✅ |
| tier1+tier2 → `~/.cursor/mcp.json` | ✅ |
| npm: @perplexity-ai/mcp-server | ✅ |
| npm: @playwright/mcp | ✅ |
| Cursor MCP UI smoke | ⏳ перезапустить Cursor → Settings → MCP |

## Ключ Perplexity

Ключ найден (формат `pplx-…`). Значение **не** записывается в отчёт.

## npm resolve

| Package | Version |
|---------|---------|
| @perplexity-ai/mcp-server | 0.9.0 |
| @playwright/mcp | 0.0.76 |

## Локальный config

- Repo root: `C:\Users\user190825\practice\Membrana`
- Cursor MCP path: `C:\Users\user190825\.cursor\mcp.json`
- Written: yes
- Generated preview: `docs/discussions/mcp-tier1-tier2.generated.json` (без реального ключа в dry-run)

## Ручная проверка (ТЗ §6)

1. Перезапустить Cursor.
2. Settings → MCP — **perplexity** и **playwright** active (или documented skip для perplexity).
3. Composer smoke Perplexity: «MCP news last 7 days» (3 источника).
4. Composer smoke Playwright: example.com title + screenshot.

**Phase B workstation:** config записан; закрытие #52 после UI smoke.
