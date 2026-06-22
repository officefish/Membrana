# Консилиум: двухконтурная RAG — план внедрения (v1.1)

> **Дата:** 2026-06-21 (обновлено после Perplexity audit)  
> **Повестка:** [`RAG_STRATEGY_CONCEPT.md`](../RAG_STRATEGY_CONCEPT.md), [`ADDITIONAL_RAG_STRATEGY_BRIEF.md`](../ADDITIONAL_RAG_STRATEGY_BRIEF.md), [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md).  
> **Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).  
> **Epic:** `rag-dual-circuit-v1` → [`RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md`](../prompts/RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md).

---

## Changelog v1.0 → v1.1

| Было | Стало |
|------|-------|
| Circuit A = Obsidian REST | Circuit A = **repo-native** (git + BM25) |
| Circuit B = Pinecone | Circuit B = **LanceDB embedded** |
| LangChain splitter | **Custom** markdown/code splitter |
| ada-002 | **text-embedding-3-small** |
| Obsidian R2 mandatory | Obsidian **R7 optional** |
| Pinecone R1 | Pinecone **R7 optional backend** |

---

## Синтез документов

| Источник | Ключевое |
|----------|----------|
| CRITICAL_RAG_AUDIT | Perplexity audit; tooling decisions; acceptance 5 questions |
| RAG_STRATEGY_CONCEPT | Канон TZ v1.1 |
| ADDITIONAL_RAG_STRATEGY_BRIEF | Sources, metadata, rituals, env |
| Текущее состояние | `context-collector.mjs`; Anthropic; office без `@membrana/*` |
| INTEGRATIONS_STRATEGY | local-first; code index = signatures + JSDoc |

---

## Итоговое решение

| Вопрос | Решение |
|--------|---------|
| Где логика? | `@membrana/rag-service` |
| Circuit A | Repo-native operative (не Obsidian-first) |
| Circuit B | LanceDB `.membrana/rag/` (default) |
| Embeddings | `text-embedding-3-small`; Voyage optional R7 |
| LangChain | **Не используем** v1 |
| Obsidian | Optional R7 |
| Pinecone | Optional pluggable backend R7 |
| Office | R4 only; R0–R3 scripts local |
| context-collector | **Гибрид** — git остаётся |
| consilium | `useLongTerm: true`, topK=8 |

---

## Архитектура

```mermaid
flowchart TB
  subgraph scripts [Root scripts]
    SC[standup / code-review / consilium / ask]
    CC[context-collector git slice]
  end

  subgraph rag [@membrana/rag-service]
    RC[retrieveContext]
    OP[OperativeRetriever repo]
    LDB[LanceDbStore]
    IDX[index / incremental]
    SPL[custom chunk + embed]
  end

  subgraph office [background-office R4+]
    API["POST /api/rag/query"]
  end

  SC --> RC
  SC --> CC
  RC --> OP
  RC --> LDB
  SPL --> LDB
  API --> RC
```

---

## Фазы R0–R7

### R0 — Каркас (S)

- Package scaffold, types, stub query, `.env.example`
- Registry ids: `rag-dual-circuit-v1`, `rag-r0-scaffold` … `rag-r7-optional`

**DoD:** typecheck + test green.

---

### R1 — LanceDB + индексация (M)

**Scope in:** docs, archives, live artifacts, code signatures (core, agenda, audio-engine, fft-analyzer), task prompts.

**Implement:**

- `store/lancedb-store.ts`
- `chunk/markdown-splitter.ts`, `chunk/code-signature-extractor.ts`
- `embed/openai-embedder.ts`
- `yarn rag:index` / `--incremental`
- Hash manifest in `.membrana/rag/` (gitignored)

**DoD:** `--full`; incremental без дубликатов; ~500–800 chunks.

---

### R2 — Operative circuit (M)

- `operative/recent-docs.ts`, `keyword-search.ts`, `path-filters.ts`
- BM25-lite + freshness boost
- No embedding per operative fragment

**DoD:** recent daily docs retrieved without vector store.

---

### R3 — Dual retriever (M)

1. Operative → score
2. If sufficient && !`useLongTerm` → skip LanceDB
3. Else embed query once → LanceDB topK
4. Merge + penalties → topK

**DoD:** 5 acceptance questions; p95 targets; rank logic unit tests 100%.

---

### R4 — background-office (M)

- `POST /api/rag/query`
- `BACKGROUND_SERVERS.md` exception for `@membrana/rag-service`

**DoD:** curl endpoint; mocked tests.

---

### R5 — Rituals (L)

| Script | Change |
|--------|--------|
| standup / main-day-issue | RAG operative query + git |
| code-review | RAG + git |
| consilium | `useLongTerm: true` |
| evening | incremental after archive (non-blocking) |

**DoD:** `yarn standup:dry` without API keys.

---

### R6 — Closure (S)

- Bootstrap `--full` on `techies68`
- `docs/RAG.md`, AGENTS.md updates
- Archive task cards

---

### R7 — Optional (S)

- Obsidian file adapter
- Pinecone / pgvector `VectorStore` impl
- Voyage A/B benchmark
- Cross-encoder reranker

---

## Acceptance questions

1. Порты office/media → `BACKGROUND_SERVERS.md`
2. Web Audio ban → `ARCHITECTURE.md`
3. Task closure → `TASK_CLOSURE_REGULATION.md`
4. Night Build stop → `NIGHT_SPRINT_REGULATION.md`
5. audio-engine boundary → `INTEGRATIONS_STRATEGY.md`

---

## Матрица рисков

| Risk | Mitigation |
|------|------------|
| Office boundary | R0–R3 local; documented R4 exception |
| CI without keys | LanceDB + fallback reads |
| Embedding vendor split | Document in `.env.example` |
| Stale index | Hash manifest + delete by source |
| Personal notes missed | Obsidian R7 optional |
| context-collector regression | Git slice always appended |

---

## Definition of Done

- [ ] R0–R6 complete
- [ ] 5 questions pass
- [ ] Rituals + fallback
- [ ] `docs/RAG.md`
- [ ] LGTM Vesnin
- [ ] No secrets in repo

---

## Следующие шаги

1. LGTM Vesnin на v1.1 plan + audit  
2. Register epic in `docs/tasks/registry.json`  
3. Branch `feat/rag-dual-circuit-r0` from `techies68`  
4. Start R0

**LGTM Vesnin:** принято с пересмотренным стеком; implementation LGTM после R3 acceptance demo.
