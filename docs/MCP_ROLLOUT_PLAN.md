# План rollout MCP (Membrana)

| Документ | Назначение |
|----------|------------|
| [`MCP_INTEGRATION_STRATEGY.md`](./MCP_INTEGRATION_STRATEGY.md) | Принципы, tier-ы, конфиденциальность |
| [`MCP_USAGE.md`](./MCP_USAGE.md) | Сценарии + fallback без ключей |
| [`TZ_MCP_Servers_Membrana.md`](./TZ_MCP_Servers_Membrana.md) | Пошаговый runbook установки |
| [`seanses/mcp-servers-rollout-2026-06-09.md`](./seanses/mcp-servers-rollout-2026-06-09.md) | Протокол консилиума |

---

## Очередь выполнения

```
#50 bootstrap (PR) → #51 phase A → #52 phase B ─┐
                              → #53 phase C  ─┴→ #54 acceptance
```

---

## Фаза 0 — Bootstrap (#50)

**Task-промпт:** [`prompts/MCP_REPO_BOOTSTRAP_PROMPT.md`](./prompts/MCP_REPO_BOOTSTRAP_PROMPT.md)  
**Реестр:** `mcp-repo-bootstrap`

**Deliverables:**

- `.gitignore`: `.gitnexus/`
- `.cursor/mcp.json` — Tier 0 only (gitnexus, без секретов)
- `docs/mcp/*.example.json` — фрагменты Tier 1–3 для локального merge
- `docs/claude_desktop_config.example.json`
- `datasets/.gitkeep`
- `yarn mcp:verify-bootstrap`

**DoD:** CI зелёный; `Closes #50`.

---

## Фаза A — Workstation (#51)

**Task-промпт:** [`prompts/MCP_WORKSTATION_PHASE_A_PROMPT.md`](./prompts/MCP_WORKSTATION_PHASE_A_PROMPT.md)  
**Реестр:** `mcp-workstation-phase-a`

Локально: Node, Git, опционально uv; gitnexus analyze; при необходимости merge `docs/mcp/tier0-workstation.example.json` в `~/.cursor/mcp.json` с путём к репо.

**Skip OK:** если gitnexus не ставится — fallback `rg` + IDE; зафиксировать в Issue #51.

---

## Фаза B — Research + browser (#52)

**Task-промпт:** [`prompts/MCP_WORKSTATION_PHASE_B_PROMPT.md`](./prompts/MCP_WORKSTATION_PHASE_B_PROMPT.md)  
**Реестр:** `mcp-workstation-phase-b`

Perplexity + Playwright — **только локальный конфиг**, ключ в vault.

**Skip OK:** нет `pplx-` → research вручную; нет Playwright → ручной браузер / Cursor browser MCP.

---

## Фаза C — Glyph (#53)

**Task-промпт:** [`prompts/MCP_WORKSTATION_PHASE_C_PROMPT.md`](./prompts/MCP_WORKSTATION_PHASE_C_PROMPT.md)  
**Реестр:** `mcp-workstation-phase-c`

Glyph по ТЗ §3 (clone + `uv sync` вне репо).

**Skip OK:** нет uv / clone — gitnexus + ripgrep; зафиксировать skip в #53.

---

## Фаза D — Acceptance (#54)

**Task-промпт:** [`prompts/MCP_ROLLOUT_ACCEPTANCE_PROMPT.md`](./prompts/MCP_ROLLOUT_ACCEPTANCE_PROMPT.md)  
**Реестр:** `mcp-rollout-acceptance`

Композитный тест + таблица «что active / что skipped + fallback».

---

## Команды

```bash
yarn mcp:verify-bootstrap          # CI: артефакты bootstrap без ключей
yarn task:list                     # статус mcp-* в реестре
yarn task:archive mcp-repo-bootstrap --notes "PR #…"
```
