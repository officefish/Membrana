## Контекст

Финальный gate «MCP развёрнут» ([`MCP_INTEGRATION_STRATEGY.md`](docs/MCP_INTEGRATION_STRATEGY.md) §7).

**Реестр:** `mcp-rollout-acceptance`  
**Task-промпт:** [`docs/prompts/MCP_ROLLOUT_ACCEPTANCE_PROMPT.md`](docs/prompts/MCP_ROLLOUT_ACCEPTANCE_PROMPT.md)

**Зависимости:** phase-a и phase-b обязательны; phase-c рекомендуется.

## Acceptance criteria

- [ ] Композитный тест 7.7 пройден
- [ ] Запись в `STRATEGIC_PLAN_DAY.md` или архив дня
- [ ] Эталонный конфиг (плейсхолдеры) в vault команды
- [ ] Задачи `mcp-repo-bootstrap` … `mcp-workstation-phase-c` в реестре archived

## Процесс

`yarn task:archive mcp-rollout-acceptance`
