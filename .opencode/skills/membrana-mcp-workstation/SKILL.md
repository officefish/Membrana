---
name: membrana-mcp-workstation
description: "Configures Membrana MCP workstation tiers (phase-a through phase-d) and verifies bootstrap fragments. Use when user mentions mcp:phase, MCP bootstrap, Perplexity, Playwright, Glyph, or Mintlify MCP setup. Do NOT use for application runtime code."
---
# Membrana MCP workstation (partial stub)

Канон: [`docs/mcp/`](../../../docs/mcp/), `docs/DOCUMENTATION_WORKFLOW.md` § MCP Tier 4.

## Verify

```bash
yarn mcp:verify-bootstrap
```

## Generate / install tiers

```bash
yarn mcp:phase-a          # yarn mcp:phase-a:install
yarn mcp:phase-b          # …
yarn mcp:phase-c
yarn mcp:phase-d          # documentation workstation merge
yarn mcp:phase-d:install  # write ~/.cursor/mcp.json
```

Fragments: `docs/mcp/tier*-*.fragment.json`  
Example full config: `docs/mcp/documentation-workstation.example.json`

## Tier 4 servers (docs sprint)

| MCP | Use |
|-----|-----|
| mintlify-reference | MDX syntax |
| mintlify-admin | Edit `apps/docs` |
| chatprd | PRD alignment |
| atlan | Glossary |

Install Mintlify + ChatPRD plugins from Cursor Marketplace.

## Output

Phase run, install path, verify-bootstrap result.
