## Контекст

Фаза A ([`MCP_INTEGRATION_STRATEGY.md`](docs/MCP_INTEGRATION_STRATEGY.md) §8). Локальная навигация по коду и датасетам.

**Реестр:** `mcp-workstation-phase-a`  
**Task-промпт:** [`docs/prompts/MCP_WORKSTATION_PHASE_A_PROMPT.md`](docs/prompts/MCP_WORKSTATION_PHASE_A_PROMPT.md)

**Зависимости:** merge + archive `mcp-repo-bootstrap`.

## Acceptance criteria

- [ ] Node ≥18, uv, Git for Windows (ТЗ §1)
- [ ] `gitnexus analyze` + `gitnexus list` показывает Membrana
- [ ] Cursor MCP: gitnexus, Git, Filesystem — active
- [ ] Тесты ТЗ 7.3, 7.4, 7.5 пройдены; скрин/log в комментарии Issue

## WHITE_PAPER

Подготовка верификации контрактов детекторов на одном узле.

## Процесс

Артефакт — отчёт в Issue (PR не обязателен). `yarn task:archive mcp-workstation-phase-a`
