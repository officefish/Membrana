## Контекст

Цепочка внедрения MCP ([`docs/MCP_ROLLOUT_PLAN.md`](docs/MCP_ROLLOUT_PLAN.md)). Первая задача: безопасные артефакты в git до установки на рабочих станциях.

**Реестр:** `mcp-repo-bootstrap`  
**Task-промпт:** [`docs/prompts/MCP_REPO_BOOTSTRAP_PROMPT.md`](docs/prompts/MCP_REPO_BOOTSTRAP_PROMPT.md)  
**Стратегия:** [`docs/MCP_INTEGRATION_STRATEGY.md`](docs/MCP_INTEGRATION_STRATEGY.md) · Runbook: [`docs/TZ_MCP_Servers_Membrana_v3.md`](docs/TZ_MCP_Servers_Membrana_v3.md)

**Зависимости:** нет (старт цепочки). Блокирует `mcp-workstation-phase-a`.

## Acceptance criteria

- [ ] `.gitignore` содержит `.gitnexus/`
- [ ] `.cursor/mcp.json` — шаблон без секретов (gitnexus global, Git, Filesystem)
- [ ] `docs/claude_desktop_config.example.json` с плейсхолдерами
- [ ] `datasets/.gitkeep` или документирован внешний путь
- [ ] CI зелёный; PR с `Closes #N`

## WHITE_PAPER

Инфраструктура агента для stage-gate / Single-Node Detection First (§8).

## Процесс

После merge: `yarn task:archive mcp-repo-bootstrap --notes "PR #…"`
