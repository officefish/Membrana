# ADDITIONAL_RAG_STRATEGY_BRIEF — расширенное ТЗ двухконтурной RAG

> **Статус:** v1.1 (2026-06-21) — синхронизировано с [`CRITICAL_RAG_AUDIT.md`](./CRITICAL_RAG_AUDIT.md).  
> Канон: [`RAG_STRATEGY_CONCEPT.md`](./RAG_STRATEGY_CONCEPT.md).  
> Epic: [`prompts/RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md`](./prompts/RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md).

---

## 1. Цель документа

Расширенное ТЗ для агента/разработчика:

- архитектура **repo-native operative (A)** + **LanceDB archive (B)**;
- логика переключения контуров;
- состав индекса и bootstrap из истории репозитория;
- инкрементальное обновление и интеграция с ритуалами.

**Superseded tooling:** Obsidian+Pinecone+LangChain+ada-002 — см. audit §1.

---

## 2. Архитектурное размещение

### 2.1 Пакет `@membrana/rag-service`

Путь: `packages/services/rag/`.

**Exports:**

- `retrieveContext(query, options?)`
- `indexFull()`, `indexIncremental()`
- `createVectorStore(config)` — LanceDB default
- `createOperativeRetriever(config)` — repo-native
- Types: `RAGFragment`, `RAGOptions`, `ChunkMetadata`, `VectorStore`

### 2.2 Потребители

| Consumer | Phase | How |
|----------|-------|-----|
| `scripts/rag-query.mjs`, rituals | R0–R3 | import `@membrana/rag-service` locally |
| `background-office` | R4+ | `POST /api/rag/query` (optional remote) |

**Не требовать** office endpoint до R4. **Не** заменять git slice в `context-collector` целиком.

### 2.3 Границы

- Секреты embeddings: `.env` локально; office Phase R4+.
- Doc RAG **≠** `background-media` Postgres.
- Office exception: единственный `@membrana/rag-service` dep — документировать в `BACKGROUND_SERVERS.md` при R4.

---

## 3. Оперативная память (Circuit A — repo-native)

### 3.1 Источники (priority order)

| Priority | Paths |
|----------|-------|
| P0 | `docs/DAILY_CODE_REVIEW.md`, `docs/MAIN_DAY_ISSUE.md`, `docs/CURRENT_TASK.md` |
| P1 | `docs/archive/daily-day/` (last N days), `docs/archive/night-build/` (last N) |
| P2 | `docs/STRATEGIC_PLAN_DAY.md`, `docs/NIGHT_BUILD_ACTIVE.md`, `docs/COMPETITION_SPRINT_ACTIVE.md` |
| P3 | Any `docs/**/*.md` changed in last `RAG_OPERATIVE_DAYS` |

### 3.2 API модуля `operative/`

```typescript
getRecentDocs(days: number): Promise<DocRef[]>
searchByPathPatterns(patterns: string[]): Promise<RAGFragment[]>
keywordSearch(query: string, opts?: { days?: number; topK?: number }): Promise<ScoredFragment[]>
```

### 3.3 Scoring

- BM25-lite or normalized keyword hit rate (no per-fragment embedding in v1).
- Freshness: today ×1.2, yesterday ×1.1, linear decay to 1.0 at 7 days.
- Pure functions: `scoreFragment`, `applyFreshnessDecay` — unit-tested.

### 3.4 Obsidian overlay (R7, optional)

- `OBSIDIAN_ENABLED=true` + `OBSIDIAN_VAULT_PATH` or REST read-only.
- Ingest `#membrana-archival` notes into operative OR archive — config flag.
- **Default false**; CI must pass with `OBSIDIAN_ENABLED=false`.

---

## 4. Долговременная память (Circuit B — LanceDB)

### 4.1 Store

```text
RAG_VECTOR_STORE=lancedb          # default
RAG_LANCEDB_PATH=.membrana/rag/   # gitignored
```

Pluggable later: `pinecone`, `pgvector` — same `VectorStore` interface.

### 4.2 Embeddings

```text
RAG_EMBEDDING_PROVIDER=openai
RAG_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=...
```

Optional:

```text
RAG_EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=...
```

Batch size: 32. **Never index with ada-002.**

### 4.3 Источники индексации

| Category | Paths |
|----------|-------|
| Docs | `docs/**/*.md`, root `*.md`, `.cursorrules`, `AGENTS.md` |
| Archives | `docs/archive/daily-day/**`, `docs/archive/daily-code-review/**`, `docs/archive/night-build/**` |
| Live | `docs/DAILY_CODE_REVIEW.md`, `docs/MAIN_DAY_ISSUE.md`, `docs/CURRENT_TASK.md` |
| Code (signatures) | `packages/core/src/**/*.ts`, `packages/agenda/src/**/*.ts`, `packages/services/audio-engine/src/**/*.ts`, `packages/services/fft-analyzer/src/**/*.ts` — exports + JSDoc only |
| Tasks/prompts | `docs/tasks/archive/**/*.md`, `docs/prompts/*_PROMPT.md` |
| Strategic | `INTEGRATIONS_STRATEGY.md`, `ARCHITECTURE.md`, `BACKGROUND_SERVERS.md`, `SERVICES.md` |

**Exclude:** `node_modules`, `dist`, `.git`, `*.generated.ts`, media, logs.

### 4.4 Chunk format

| Field | Description |
|-------|-------------|
| `source` | File path |
| `type` | `doc` \| `code` \| `archive` \| `task` \| `prompt` |
| `timestamp` | ISO mtime |
| `tags` | frontmatter / inferred |
| `priority` | 1.0 active, 0.5 historical archive |
| `chunkIndex` | Index in file |
| `isHistorical` | true for dated archives |
| `status` | `active` \| `archived` |
| `headingPath` | Markdown heading breadcrumb |

Chunking: custom splitter ~500 tokens, overlap ~50. **No LangChain in v1.**

### 4.5 Index pipeline

**Full (`yarn rag:index --full`):**

1. Scan sources → chunk → embed batches → upsert LanceDB.
2. Write `.membrana/rag/file-hashes.json`.
3. Delete stale vector ids for removed/changed files.

**Incremental (`--incremental`):**

1. Compare hashes → re-embed changed files only.
2. Trigger: evening ritual after `archive:daily-day` (non-blocking).
3. Monthly or on embedding model change → `--full`.

**Volume estimate:** ~500–800 chunks — trivial for LanceDB; embedding cost < $0.05 one-time.

---

## 5. Dual retriever

### 5.1 Pipeline

```
query
  → Circuit A (operative keyword + recency)
  → if sufficient && !useLongTerm → return topK
  → else Circuit B (embed query once → LanceDB topK)
  → merge + longTermPenalty + freshness
  → return RAGFragment[]
```

### 5.2 Env thresholds

```text
RAG_OPERATIVE_RELEVANCE_THRESHOLD=0.6
RAG_MIN_OPERATIVE_COUNT=3
RAG_LONG_TERM_PENALTY=0.9
RAG_TOP_K=5
```

### 5.3 Options

| Option | Use case |
|--------|----------|
| `{ useLongTerm: true }` | consilium, `--full-rag` |
| `{ historical: true }` | Questions about past decisions |
| `{ topK: 8 }` | consilium |
| `{ operativeDays: 14 }` | Extended morning context |

---

## 6. Bootstrap (first `--full`)

1. Select all sources (§4.3).
2. Archive folders: `isHistorical: true`, `priority: 0.5`, `date` from folder name.
3. Code: signature extractor only (no implementations).
4. Run `yarn rag:index --full`.
5. Validate 5 acceptance questions (audit §10).
6. Commit **only** hash manifest path in `.gitignore` rules — not the LanceDB file.

---

## 7. Ritual integration

| Ritual | Action |
|--------|--------|
| Morning | `retrieveContext("вчера, блокеры, фокус")` + context-collector git |
| Evening | after `archive:daily-day` → `rag:index:incremental` (async, no block on code-review) |
| code-review | RAG block + existing git/diff logic |
| consilium | `useLongTerm: true`, topK=8; `--no-rag` escape |
| yarn ask | `--rag`; architect personas default on |

**Acceptance:** `yarn standup:dry` passes without `OPENAI_API_KEY`.

---

## 8. Dependencies

### 8.1 `@membrana/rag-service` (v1)

```json
{
  "dependencies": {
    "@lancedb/lancedb": "^0.x",
    "glob": "^10.3.0",
    "gray-matter": "^4.0.3"
  }
}
```

OpenAI/Voyage: `fetch` or minimal SDK in `embed/` — no LangChain.

### 8.2 Optional R7

- `@pinecone-database/pinecone` — if `RAG_VECTOR_STORE=pinecone`
- `pg` + `pgvector` — if pgvector backend
- Obsidian: `axios` for REST optional

---

## 9. Implementation steps (aligned with epic R0–R7)

1. R0 — package scaffold, types, stub
2. R1 — LanceDB store, splitter, embedder, full/incremental index
3. R2 — operative repo retriever
4. R3 — `retrieveContext` merge logic + tests
5. R4 — office endpoint + BACKGROUND_SERVERS exception
6. R5 — ritual script hooks
7. R6 — bootstrap on `techies68`, docs/RAG.md, AGENTS.md
8. R7 — optional Obsidian, Pinecone/pgvector, Voyage A/B, reranker

---

## 10. Acceptance criteria

- [ ] 5 benchmark questions pass (audit §10)
- [ ] Incremental: single file change → no duplicate chunks
- [ ] Fallback without API keys
- [ ] p95 latency targets met
- [ ] No secrets in repo; `.env.example` complete
- [ ] CI without Pinecone/Obsidian

---

## 11. Future (post-v1)

- BGE-M3 local embeddings (INTEGRATIONS_STRATEGY эшелон 1)
- Hybrid tsvector if pgvector backend adopted
- Auto-write consilium outcomes → archive + index
- Client read-only RAG status indicator

Документ согласован с ритуалами [`DEVELOPER_RHYTHM.md`](./DEVELOPER_RHYTHM.md) и audit Perplexity 2026-06-21.
