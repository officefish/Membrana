---
name: membrana-docs-sync
description: "Syncs Membrana documentation layers after code changes: Mintlify apps/docs, client catalog, CONCEPT/README, DOCUMENTATION_WORKFLOW RAG ritual. Use when user updates docs, Mintlify, catalog status, or asks docs:lint / catalog:verify-client / RAG index after doc PR. Do NOT use for ChatPRD PRD updates only (ChatPRD plugin) without repo docs."
---
# Membrana docs sync

Канон: [`docs/DOCUMENTATION_WORKFLOW.md`](../../../docs/DOCUMENTATION_WORKFLOW.md).

## Layers

| Layer | Path | Check |
|-------|------|-------|
| Canon | `packages/*/DEVICE_BOARD_CONCEPT.md`, package README | git |
| Agent catalog | `docs/catalog/client/` | `yarn catalog:verify-client` |
| Mintlify | `apps/docs/` | `yarn docs:lint`, `yarn docs:dev` |
| Workflow | `docs/DOCUMENTATION_WORKFLOW.md` | git |

## After doc changes (required)

```bash
yarn docs:lint
yarn catalog:verify-client
```

## RAG index ritual (when `yarn rag:index` exists in package.json)

1. Run lint + catalog verify (above).
2. `yarn rag:index` (incremental).
3. Smoke: `yarn rag:query "device-board undo branch switch"`.

**Target globs:** `docs/**/*.md`, `apps/docs/**/*.mdx`, `packages/device-board/*.md`, `docs/catalog/client/**/*.md`.

**Never commit** `.membrana/rag/`.

If RAG scripts missing → document defer in task `archiveNotes`; see `membrana-rag-operator`.

## Mintlify node pages order

1. Atlan term (if any) → 2. Code → 3. `apps/docs/...` → 4. Catalog one-liner → 5. ChatPRD update-prd.

## Output

Table: file | layer | status; list verification commands run.
