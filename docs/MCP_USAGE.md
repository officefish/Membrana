# MCP — сценарии использования и fallback

> Стратегия: [`MCP_INTEGRATION_STRATEGY.md`](./MCP_INTEGRATION_STRATEGY.md)  
> Установка: [`TZ_MCP_Servers_Membrana.md`](./TZ_MCP_Servers_Membrana.md)

**Главное правило:** отсутствие API-ключа или сбой MCP-сервера **не блокирует** разработку. Отключите проблемный сервер в настройках клиента и используйте fallback ниже.

---

## Tier 0 — всегда доступно (без ключей)

| Сервер | Задача | Fallback если MCP недоступен |
|--------|--------|------------------------------|
| **gitnexus** | Граф зависимостей, impact | `rg`, `yarn turbo run … --dry`, IDE «Find references» |
| **Git** (example) | diff, log, blame через MCP (`uvx mcp-server-git`; npm-пакет снят) | `git` в терминале |
| **Filesystem** (example) | чтение дерева в scope | Cursor @files, Read tool |

Committed config [`.cursor/mcp.json`](../.cursor/mcp.json) содержит **только gitnexus**, чтобы Cursor не падал на чужих путях/ключах.

Workstation merge: [`mcp/tier0-workstation.example.json`](./mcp/tier0-workstation.example.json) — скопировать блоки в **локальный** `~/.cursor/mcp.json`, заменить `__MEMBRANA_ROOT__`.

---

## Tier 1 — Perplexity (ключ опционален)

| Нужен ключ | `PERPLEXITY_API_KEY` (`pplx-…`) в корневом `.env` или локальном MCP config |
| Установка | `yarn mcp:phase-b:install` (читает `.env`, merge в `~/.cursor/mcp.json`) |
|------------|---------------------------------------------------------------------|
| Пример | [`mcp/tier1-perplexity.fragment.json`](./mcp/tier1-perplexity.fragment.json) |

**Fallback без ключа:**

- Публичный поиск в браузере (arXiv, papers, docs vendor).
- Документы репо: `docs/WHITE_PAPER.md`, `docs/ARCHITECTURE.md`, `yarn analyzers:research:week` (если есть `ANTHROPIC_API_KEY` — отдельно от Perplexity).
- `yarn ask dynin "…"` / консилиум — **не** замена Perplexity, но для внутренних вопросов по коду достаточно.

**Если ключ есть, но не работает (403, billing):** удалить блок `perplexity` из MCP config → перезапустить клиент → fallback выше.

---

## Tier 2 — Playwright (без API-ключа, но нужен Chromium)

| Setup | `npx @playwright/mcp@latest` (скачивает Chromium ~300 МБ) |
|-------|-----------------------------------------------------------|
| Пример | [`mcp/tier2-playwright.fragment.json`](./mcp/tier2-playwright.fragment.json) |

**Fallback:**

- Ручная проверка в Chrome/Edge.
- Cursor **Browser** MCP (если включён в IDE).
- Unit/e2e тесты в `apps/client` — когда появятся; не блокируют daily work.

**Если Chromium не скачивается:** не добавлять playwright в config.

---

## Tier 3 — Glyph (Go, без API-ключа)

| Setup | `go install github.com/benmyles/glyph@latest` → `yarn mcp:phase-c:install` |
|-------|-------------------------------------------------------------------------------|
| Пример | [`mcp/tier3-glyph.fragment.json`](./mcp/tier3-glyph.fragment.json) |

**Fallback:**

- gitnexus + `rg -n "symbol" packages/`
- IDE outline / Go to symbol

**Если Go не установлен:** `winget install GoLang.Go`, затем `yarn mcp:phase-c:install`. Или skip + gitnexus.

---

## Anthropic (не MCP)

Скрипты `yarn consilium`, `yarn plan:day`, `yarn code-review` — ключ `ANTHROPIC_API_KEY` в `.env`.

| Нет ключа | Команда |
|-----------|---------|
| Утро без API | `yarn ritual:day:no-api` |
| Standup | `yarn standup:dry` |
| Smoke | пропустить; `yarn morning-care --no-anthropic` |

---

## Быстрая диагностика

```bash
yarn mcp:verify-bootstrap    # файлы в репо, нет утечки pplx-/sk-ant- в example
```

Cursor: Settings → MCP → красный сервер → Disable → остальные Tier 0 продолжают работать.

Claude Desktop: Settings → Developer → MCP Log; временно убрать проблемный блок из `claude_desktop_config.json`.

---

## Сценарии для команды Membrana

| Задача | Предпочтительно | Fallback |
|--------|-----------------|----------|
| Найти импорты нарушающие ARCHITECTURE | gitnexus | `rg "@membrana"` |
| Research DSP / YAMNet | Perplexity MCP | arXiv + `analyzers:research:week` |
| Проверить UI demo микрофона | Playwright MCP | ручной браузер |
| Outline detector packages | Glyph | gitnexus + IDE |
| Коллективное решение | `yarn consilium` | протокол в `docs/seanses/` вручную |
