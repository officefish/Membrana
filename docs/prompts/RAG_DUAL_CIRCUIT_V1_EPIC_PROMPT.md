# Промпт (эпик): Dual-circuit RAG v1 — LanceDB + repo operative memory

> **Эпик** `rag-dual-circuit-v1` — двухконтурная RAG для ритуалов и consilium.  
> **Размер:** L (фазы R0–R6 обязательны, R7 optional).  
> **Основание:** [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md), консилиум 2026-06-21.  
> **Supersedes:** Obsidian+Pinecone+LangChain+ada-002 в черновиках strategy docs.

---

## Контекст

Membrana нужен **единый контекстный слой** для `standup`, `code-review`, `consilium`, `yarn ask` — без замены `context-collector` git slice.

**Пересмотренный стек (LGTM после audit):**

| Layer | Choice |
|-------|--------|
| Circuit A (operative) | Repo-native: git recency + BM25/ripgrep on `docs/` |
| Circuit B (archive) | **LanceDB embedded** `.membrana/rag/` |
| Embeddings | **text-embedding-3-small** (default); Voyage 3 Lite optional R7 |
| Chunking | Custom markdown/code splitter (**no LangChain v1**) |
| Obsidian / Pinecone | **Optional R7**, not blocking CI |

**Read before coding:**

| # | Document |
|---|----------|
| 1 | [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md) |
| 2 | [`RAG_STRATEGY_CONCEPT.md`](../RAG_STRATEGY_CONCEPT.md) |
| 3 | [`ADDITIONAL_RAG_STRATEGY_BRIEF.md`](../ADDITIONAL_RAG_STRATEGY_BRIEF.md) |
| 4 | [`SERVICES.md`](../SERVICES.md) — `@membrana/rag-service` pattern |
| 5 | [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) — office boundary, R4 exception |
| 6 | [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) — local-first, code index scope |

**Out of scope:**

- Doc RAG in `background-media` Postgres
- Mem0/Zep/Letta SaaS memory
- Client UI (except post-v1 read-only status)
- Replacing Anthropic with OpenAI for LLM calls

**Branch:** `feat/rag-dual-circuit-r0` ← `techies68` (each phase may stack or separate PRs per Teamlead).

---

## Подзадачи (строгий порядок)

| Phase | Registry `id` | Lead | Content |
|-------|---------------|------|---------|
| **R0** | `rag-r0-scaffold` | Ozhegov | Package `@membrana/rag-service`, types, stub `retrieveContext`, `.env.example`, `yarn rag:query` |
| **R1** | `rag-r1-lancedb-index` | Ozhegov + Dynin | LanceDB store, custom splitter, OpenAI embedder, full/incremental index |
| **R2** | `rag-r2-operative` | Ozhegov | Repo operative retriever (git recency, paths, keyword/BM25) |
| **R3** | `rag-r3-retriever` | Dynin + Ozhegov | Dual-circuit merge, thresholds, unit tests, 5 acceptance questions |
| **R4** | `rag-r4-office-api` | Ozhegov + Vesnin | NestJS `POST /api/rag/query`, BACKGROUND_SERVERS exception |
| **R5** | `rag-r5-rituals` | Vesnin | standup, code-review, consilium, evening incremental hook |
| **R6** | `rag-r6-closure` | Vesnin | Bootstrap `--full`, `docs/RAG.md`, AGENTS.md, epic archive |
| **R7** | `rag-r7-optional` | Ozhegov | Obsidian overlay, Pinecone/pgvector backends, Voyage A/B, reranker |

> **Stop rule:** 2 scoped CI fail подряд → WIP commit, блокер в Issue, Vesnin review.

---

## R0 — Scaffold

**Deliverables:**

- `packages/services/rag/` — `service.ts`, `types.ts`, `index.ts`, `package.json`, `tsconfig.json`, `README.md`
- Types: `RAGFragment`, `RAGOptions`, `RAGQueryResult`, `ChunkMetadata`, `VectorStore` interface
- `scripts/rag-query.mjs` — CLI stub
- Root `package.json` scripts: `rag:query`, `rag:index`, `rag:index:incremental`
- `.env.example` — vars from audit §9

**DoD:** `yarn workspace @membrana/rag-service typecheck test` green.

---

## R1 — LanceDB + indexing

**Implement:**

- `store/lancedb-store.ts` — upsert, deleteBySource, query
- `chunk/markdown-splitter.ts`, `chunk/code-signature-extractor.ts`
- `embed/openai-embedder.ts` (batch 32)
- `index/full-index.ts`, `index/incremental-index.ts`
- Manifest: `.membrana/rag/file-hashes.json` (gitignore dir)

**DoD:**

- `yarn rag:index --full` on repo
- Incremental: touch 1 md → re-index without duplicates
- ~500–800 chunks indexed

---

## R2 — Operative circuit

**Implement:**

- `operative/recent-docs.ts` — git log / mtime
- `operative/keyword-search.ts` — ripgrep or BM25-lite
- `operative/path-filters.ts` — P0–P3 paths from brief §3.1
- Freshness boost constants

**DoD:** operative-only query returns recent daily artifacts without LanceDB.

---

## R3 — Dual retriever

**Implement:** `retrieveContext()` per brief §5.

**Tests:** table-driven thresholds; mocked stores.

**Acceptance (must pass):**

1. Ports office/media → `BACKGROUND_SERVERS.md`
2. Web Audio ban → `ARCHITECTURE.md` / `.cursorrules`
3. Task closure → `TASK_CLOSURE_REGULATION.md`
4. Night Build stop → `NIGHT_SPRINT_REGULATION.md`
5. audio-engine boundary → `INTEGRATIONS_STRATEGY.md`

**DoD:** p95 < 3s local mock; < 5s with real embeddings; all 5 questions P@5.

---

## R4 — background-office

- `RagModule`, `POST /api/rag/query` `{ query, options? }` → `{ fragments[] }`
- Auth: existing office token pattern
- Amend `BACKGROUND_SERVERS.md` — `@membrana/rag-service` allowed dep
- Vitest with mocked rag-service

**DoD:** `curl localhost:3000/api/rag/query` works when office dev + keys present.

---

## R5 — Rituals

| Script | Change |
|--------|--------|
| `_daily-standup.mjs` | prepend RAG operative query |
| `_main-day-issue.mjs` | same template |
| `code-review.mjs` | RAG + keep git |
| `consilium.mjs` | default `useLongTerm: true`, `--no-rag` |
| Persona ask | `--rag`; vesnin/ozhegov default |
| Evening chain | after `archive:daily-day` → `rag:index:incremental` non-blocking |

**Fallback:** no keys → current behavior.

**DoD:** `yarn standup:dry` without `OPENAI_API_KEY`.

---

## R6 — Closure

- One-time `yarn rag:index --full` on `techies68`
- `docs/RAG.md` — operator guide
- `AGENTS.md`, `CONTRIBUTING.md`, `DEVELOPER_RHYTHM.md` — RAG section
- `yarn task:archive rag-r0…rag-r6`
- GitHub Issue closure

---

## R7 — Optional extensions

- `obsidian/file-adapter.ts` (`OBSIDIAN_ENABLED`)
- `store/pinecone-store.ts`, `store/pgvector-store.ts`
- Voyage embedder + A/B report
- Cross-encoder reranker

**DoD:** each backend behind `RAG_VECTOR_STORE` env; CI still defaults LanceDB-only.

---

## Scoped CI (each phase)

```bash
yarn workspace @membrana/rag-service lint typecheck test
# R4+ additionally:
yarn workspace @membrana/background-office typecheck test
```

---

## Definition of Done (epic)

- [ ] R0–R6 complete
- [ ] 5 acceptance questions pass
- [ ] Rituals integrated with fallback
- [ ] `docs/RAG.md` + package README
- [ ] No secrets committed
- [ ] LGTM Vesnin

---

## Связанные артефакты

- Консилиум: [`discussions/rag-strategy-implementation-plan-2026-06-21-consilium.md`](../discussions/rag-strategy-implementation-plan-2026-06-21-consilium.md)
- Audit: [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md)
