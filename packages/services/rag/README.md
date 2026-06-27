# @membrana/rag-service

Dual-circuit RAG for Membrana developer rituals and consilium.

## Что делает

- **Circuit A (operative):** recent `docs/` + git recency + BM25/keyword (no embeddings).
- **Circuit B (archive):** LanceDB embedded index (`.membrana/rag/`) over docs, archives, code signatures.
- **`retrieveContext(query, options)`** — dual retriever with skip-archive thresholds; `useLongTerm` for consilium.

## Установка

Workspace package — `yarn install` at repo root.

```bash
yarn workspace @membrana/rag-service build
```

## Использование

```bash
yarn rag:query "background-office port"
yarn rag:query "Night Build stop rule" -- --full-rag

yarn rag:index --full
yarn rag:index:incremental
```

| Flag / env | Effect |
|------------|--------|
| Operative only | Works **without** `OPENAI_API_KEY` |
| Archive / `--full-rag` | Requires `OPENAI_API_KEY` + `yarn rag:index --full` |
| `OPENAI_BASE_URL` | Optional proxy or OpenAI-compatible `/v1` endpoint |
| `RAG_REPO_ROOT` | Override monorepo root (office / scripts) |

Rituals use `scripts/lib/rag-ritual.mjs` — see [`docs/RAG.md`](../../../docs/RAG.md).

## API

| Export | Description |
|--------|-------------|
| `retrieveContext` | Main dual-circuit retriever |
| `RagService` | Class with `indexFull` / `indexIncremental` |
| `loadRagConfig` | Env-based config |
| `formatFragmentsForPrompt` | Prompt block for Anthropic scripts |
| `planDualRetrieval` | Threshold logic (tests / advanced) |

## Документация

- [`docs/RAG.md`](../../../docs/RAG.md) — operator guide
- [`docs/CRITICAL_RAG_AUDIT.md`](../../../docs/CRITICAL_RAG_AUDIT.md) — tooling decisions
- [`docs/rag-dual-circuit-v1/CLOSURE.md`](../../../docs/rag-dual-circuit-v1/CLOSURE.md) — epic closure R0–R6

## Phase status

| Phase | Status |
|-------|--------|
| R0–R6 | ✅ shipped |
| R7 (Obsidian, Pinecone, Voyage) | optional / planned |
