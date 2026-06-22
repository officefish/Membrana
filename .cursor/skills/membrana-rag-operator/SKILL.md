---
name: membrana-rag-operator
description: >-
  Operates Membrana dual-circuit RAG when yarn rag:index and yarn rag:query exist.
  Use when indexing docs after merge, smoke queries, or RAG corpus paths. Do NOT run
  if package.json lacks rag scripts — report defer and point to DOCUMENTATION_WORKFLOW.
---

# Membrana RAG operator (stub until merge)

**Status:** `@membrana/rag-service` source and `yarn rag:*` may be absent on current branch. Check root `package.json` before running.

Канон: [`docs/RAG.md`](../../../docs/RAG.md) (when present), [`docs/DOCUMENTATION_WORKFLOW.md`](../../../docs/DOCUMENTATION_WORKFLOW.md) § RAG.

## If scripts available

```bash
yarn docs:lint && yarn catalog:verify-client
yarn rag:index              # incremental
yarn rag:index --full       # archive circuit rebuild (needs OPENAI_API_KEY)
yarn rag:query "device-board undo branch switch"
```

## Corpus globs

- `docs/**/*.md`
- `apps/docs/**/*.mdx`
- `packages/device-board/*.md`
- `docs/catalog/client/**/*.md`

## Never commit

`.membrana/rag/` (LanceDB artifacts).

## If unavailable

1. Update docs workflow only (`membrana-docs-sync`).
2. Note **index deferred** in `yarn task:archive --notes`.
3. Re-run index once after RAG merges to `main`.
