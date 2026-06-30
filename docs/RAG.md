# RAG — dual-circuit context for Membrana rituals

> **Package:** `@membrana/rag-service` (`packages/services/rag`)  
> **Epic:** `rag-dual-circuit-v1` · [`prompts/RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md`](./prompts/RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md)  
> **Audit:** [`CRITICAL_RAG_AUDIT.md`](./CRITICAL_RAG_AUDIT.md)

---

## TL;DR

| Question | Answer |
|----------|--------|
| Local or cloud? | **Local-first:** LanceDB on disk (`.membrana/rag/`), repo operative search |
| Need `background-office`? | **No** for local scripts; **optional** remote via `POST /api/rag/query` (R4) |
| Need API keys? | **Embeddings:** `OPENAI_API_KEY` from R1; rituals **fallback** without keys |
| vs gitnexus? | gitnexus = code graph (MCP); RAG = docs/archives semantics |

---

## Commands

```bash
yarn workspace @membrana/rag-service build   # after code changes

yarn rag:query "Какие порты background-office?"
yarn rag:query "Night Build stop rule" -- --full-rag

yarn rag:index --full                          # R1+
yarn rag:index:incremental                     # after archive:daily-day (R5)
```

CLI flags for `rag:query` (pass after `--`):

| Flag | Effect |
|------|--------|
| `--full-rag` | `useLongTerm: true` (archive circuit) |
| `--historical` | Boost archive chunks |
| `--top-k N` | Fragment count |
| `--json` | Raw `RAGQueryResult` JSON |

---

## Environment

See [`.env.example`](../.env.example) block `RAG dual-circuit`.

Key vars:

```text
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1 # optional proxy / OpenAI-compatible endpoint
RAG_EMBEDDING_PROVIDER=openai             # openai | voyage
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_VECTOR_STORE=lancedb
RAG_LANCEDB_PATH=.membrana/rag/
RAG_OPERATIVE_DAYS=7
```

For Voyage use `VOYAGE_API_KEY` and `RAG_EMBEDDING_PROVIDER=voyage`; the default model is
`voyage-4-lite`. Provider selection is explicit: runtime failover is intentionally disabled
because providers use different vector spaces. Changing provider or model requires
`yarn rag:index --full`; incremental indexing rejects a mismatched embedding fingerprint.

Index directory is **gitignored** — regenerate with `yarn rag:index --full`.

---

## Office HTTP API (R4)

When `yarn office:dev` is running (port 3000):

```bash
curl -s -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "X-Membrana-Token: $API_INTERNAL_TOKEN" \
  -d '{"query":"background-office port","options":{"useLongTerm":true}}'
```

| Item | Detail |
|------|--------|
| Auth | Same `X-Membrana-Token` as `/v1/claude/*` |
| Body | `{ "query": string, "options"?: RAGOptions }` |
| Response | `{ query, fragments[], usedArchive, usedOperative }` |
| Archive | Requires `OPENAI_API_KEY` + `yarn rag:index --full` on server |
| Security | See [`BACKGROUND_SERVERS.md`](./BACKGROUND_SERVERS.md) → R4 exception |

**Not for browser client** — server-to-server / ritual scripts only.

---

## Architecture (phases)

| Phase | Deliverable |
|-------|-------------|
| **R0** ✅ | Package scaffold, stub query/index |
| **R1** ✅ | LanceDB + embedder + full/incremental index |
| **R2** ✅ | Repo operative circuit |
| **R3** ✅ | Dual retriever + 5 acceptance questions |
| **R4** ✅ | `background-office` `POST /api/rag/query` (see below) |
| **R5** ✅ | standup, code-review, consilium, evening incremental hook |
| **R6** ✅ | Bootstrap docs + closure ([`rag-dual-circuit-v1/CLOSURE.md`](./rag-dual-circuit-v1/CLOSURE.md)) |
| **R7** | Obsidian / Pinecone / Voyage optional |

---

## Ritual integration (R5)

Hybrid with existing `context-collector.mjs` — git slice **always** appended. RAG via `scripts/lib/rag-ritual.mjs`.

| Ritual | RAG behavior | Opt-out |
|--------|--------------|---------|
| `yarn standup` | operative query (`STANDUP_RAG_QUERY`) | `--no-rag` |
| `yarn main-day-issue` | operative (`MAIN_DAY_RAG_QUERY`) | `--no-rag` |
| `yarn code-review` | operative + git context | `--no-rag` |
| `yarn consilium` | archive `useLongTerm: true`, topK=8 | `--no-rag` |
| `yarn ask vesnin\|ozhegov` | operative on question (default) | `--no-rag` |
| `yarn ask <other>` | off unless `--rag` | — |
| `yarn ritual:evening` | `rag:index:incremental` after `archive:daily-day` (non-blocking) | skip if no key |

Fallback: operative works without `OPENAI_API_KEY`; archive skipped gracefully; rituals continue.

**Epic closure:** [`rag-dual-circuit-v1/CLOSURE.md`](./rag-dual-circuit-v1/CLOSURE.md) — bootstrap `--full` отложен до появления ключа.

---

## Read order for agents

1. [`CRITICAL_RAG_AUDIT.md`](./CRITICAL_RAG_AUDIT.md)
2. [`RAG_STRATEGY_CONCEPT.md`](./RAG_STRATEGY_CONCEPT.md)
3. This file
4. Package [`README.md`](../packages/services/rag/README.md)
