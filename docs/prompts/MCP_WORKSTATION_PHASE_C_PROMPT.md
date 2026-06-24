# Промпт: MCP workstation — фаза C (#53)

> **Task-промпт.** Размер: **S**. Реестр: `mcp-workstation-phase-c` · Issue **#53**  
> **Зависимость:** `mcp-workstation-phase-a` archived. Параллельно с phase B допустима.

---

## Контекст

Glyph — outline символов кодовой базы (benmyles/glyph, Go). **Опционален:** нужен Go (`go install`).

Fragment: [`tier3-glyph.fragment.json`](../mcp/tier3-glyph.fragment.json).  
Конфиденциальность: [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §5.

---

## Промпт целиком

### Задача

1. Go: `winget install GoLang.Go` (если нет `go`).
2. `yarn mcp:phase-c:install` — `go install github.com/benmyles/glyph@latest`, merge в `~/.cursor/mcp.json`.
3. Перезапуск Cursor; smoke: outline `packages/services/detectors` (ТЗ §6.3).

### Fallback

| Проблема | Fallback |
|----------|----------|
| нет uv | gitnexus + `rg` |
| clone fail | IDE outline |
| glyph-mcp error | skip в Issue #53 |

### DoD

- [ ] Glyph smoke **или** documented skip + fallback
- [ ] Команда прочитала §5 конфиденциальности
- [ ] `yarn task:archive mcp-workstation-phase-c`
