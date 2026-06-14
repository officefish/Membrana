# Промпт: MCP workstation — фаза C (#53)

> **Task-промпт.** Размер: **S**. Реестр: `mcp-workstation-phase-c` · Issue **#53**  
> **Зависимость:** `mcp-workstation-phase-a` archived. Параллельно с phase B допустима.

---

## Контекст

Glyph — outline символов кодовой базы (ТЗ §3). **Опционален:** нужен `uv` + git clone вне репо.

Fragment: [`tier3-glyph.fragment.json`](../mcp/tier3-glyph.fragment.json).  
Конфиденциальность: [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §5.

---

## Промпт целиком

### Задача

1. `uv --version`; clone `https://github.com/benmyles/glyph` в `$HOME/glyph` (не submodule Membrana).
2. `uv sync`; `uv run --directory <path> glyph-mcp --help`.
3. Merge fragment в локальный config; `__GLYPH_ROOT__` → абсолютный путь.
4. Smoke: outline `packages/services/detectors` (ТЗ §6.3).

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
