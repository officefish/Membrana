# MCP Phase D — documentation workstation

> Сгенерировано: 2026-06-19T17:30:53.012Z (`yarn mcp:phase-d`)

## Tier 4 серверы

| Сервер | Назначение | Auth |
|--------|------------|------|
| mintlify-reference | Синтаксис Mintlify MDX / docs.json | нет |
| mintlify-admin | Правка `apps/docs` через MCP | OAuth |
| chatprd | PRD, search, alignment | OAuth / plan |
| atlan-docs | Справка по Atlan product docs | нет |
| atlan | Корп. glossary, semantic_search | OAuth / API key |

## Сгенерированные файлы

- Repo root: `C:\Users\user190825\practice\Membrana`
- Generated: `C:\Users\user190825\practice\Membrana\docs\discussions\mcp-documentation.generated.json`
- Cursor MCP: `C:\Users\user190825\.cursor\mcp.json`
- Written to Cursor: no (use `yarn mcp:phase-d:install`)

## Серверы в merge

- `gitnexus`
- `git`
- `filesystem`
- `mintlify-reference`
- `mintlify-admin`
- `chatprd`
- `atlan-docs`
- `atlan`

## Ручная проверка

1. Перезапустить Cursor.
2. Settings → MCP — tier4 серверы active (OAuth для admin/chatprd/atlan).
3. Composer: «Какие Mintlify components доступны?» (mintlify-reference).
4. ChatPRD: «Найди PRD device board» (после sync `prd/device-board-mvp-docs.md`).

Документация: [`docs/DOCUMENTATION_WORKFLOW.md`](../DOCUMENTATION_WORKFLOW.md).
