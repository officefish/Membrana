## Phase A — in progress (`techies68`)

**Done automatically:**
- `yarn mcp:phase-a:install` → tier0 (gitnexus + git + filesystem) in `~/.cursor/mcp.json`
- Node v25, Git 2.53, uv 0.10 — OK
- `gitnexus list` — OK

**Skip (fallback, не блокирует):**
- `gitnexus analyze` — exit 1: missing `tree-sitter-kotlin` in gitnexus npx cache (upstream). Fallback: `rg`, IDE — `docs/MCP_USAGE.md`
- `gitnexus list` пока показывает `sound-analyzer`, не Membrana — после fix analyze переиндексировать Membrana

**Report:** `docs/discussions/mcp-phase-a-report.md`

**Manual (DoD):**
1. Restart Cursor → Settings → MCP → gitnexus/git/filesystem **active**
2. Smoke: git log / list `packages/core` via MCP
3. Then `yarn task:archive mcp-workstation-phase-a`
