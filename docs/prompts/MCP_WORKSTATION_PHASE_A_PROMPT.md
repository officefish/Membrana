# Промпт: MCP workstation — фаза A (#51)

> **Task-промпт.** Размер: **S**. Реестр: `mcp-workstation-phase-a` · Issue **#51**  
> **Зависимость:** `mcp-repo-bootstrap` archived.

---

## Контекст

Локальная навигация: **gitnexus**, Git MCP, Filesystem MCP. **Без API-ключей.**

Runbook: [`TZ_MCP_Servers_Membrana.md`](../TZ_MCP_Servers_Membrana.md) §1 (runtime).  
Example: [`docs/mcp/tier0-workstation.example.json`](../mcp/tier0-workstation.example.json).

---

## Промпт целиком

### Задача

1. Node ≥18, Git установлены (`node --version`, `git --version`).
2. `npx gitnexus analyze` в корне Membrana; `gitnexus list` показывает проект.
3. Скопировать tier0 example в **локальный** `~/.cursor/mcp.json`, заменить `__MEMBRANA_ROOT__` на абсолютный путь.
4. Cursor Settings → MCP: gitnexus active; Git/Filesystem — если пути верны.

### Fallback (обязательно задокументировать в Issue если skip)

| Проблема | Fallback |
|----------|----------|
| gitnexus не ставится | `rg`, IDE search |
| Git/FS MCP красные | оставить только gitnexus или только IDE |
| Windows path | двойные `\\` в JSON |

### DoD

- [ ] gitnexus smoke OK **или** skip + fallback в комментарии #51
- [ ] `yarn task:archive mcp-workstation-phase-a`

**PR не обязателен** — артеfact в Issue.
