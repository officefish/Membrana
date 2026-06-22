# RAG_STRATEGY_CONCEPT — двухконтурная RAG в Membrana

> **Статус:** v1.1 (2026-06-21) — tooling пересмотрен по [`CRITICAL_RAG_AUDIT.md`](./CRITICAL_RAG_AUDIT.md).  
> Расширенное ТЗ: [`ADDITIONAL_RAG_STRATEGY_BRIEF.md`](./ADDITIONAL_RAG_STRATEGY_BRIEF.md).  
> План: [`discussions/rag-strategy-implementation-plan-2026-06-21-consilium.md`](./discussions/rag-strategy-implementation-plan-2026-06-21-consilium.md).

---

## 1. Цель

Интегрировать **двухконтурную систему памяти** для повышения качества ответов AI-агентов (Claude):

- **Оперативная память (Circuit A)** — недавний контекст репозитория: `docs/`, daily artifacts, git recency (дни/недели).
- **Долговременная память (Circuit B)** — векторный архив документации, истории решений, selective code signatures (~500–800 чанков).

Система автоматически подбирает релевантный контекст, минимизируя шум. **Obsidian** и **Pinecone** — опциональные расширения (Phase R7+), не blocking path.

---

## 2. Архитектурное размещение

| Компонент | Роль |
|-----------|------|
| `@membrana/rag-service` | `packages/services/rag` — retrieve, index, chunk, embed (без React/DOM, без `@membrana/core`) |
| Root scripts | R0–R3: прямой вызов rag-service + `.env` (как `context-collector`) |
| `background-office` | **Phase R4:** `POST /api/rag/query` → rag-service (единственное allowed `@membrana/*` dep) |
| Rituals | standup, code-review, consilium — **гибрид**: git slice + RAG docs |

**Не смешивать** doc RAG с `background-media` (audio data-plane).

---

## 3. Оперативная память (repo-native, Circuit A)

### 3.1 Источники

- `docs/DAILY_CODE_REVIEW.md`, `docs/MAIN_DAY_ISSUE.md`, `docs/CURRENT_TASK.md`, `docs/STRATEGIC_PLAN_DAY.md`
- `docs/archive/daily-day/<recent>/`, `docs/archive/night-build/<recent>/`
- Файлы с mtime / `git log` за последние `RAG_OPERATIVE_DAYS` (default 7)

### 3.2 Поиск

- `getRecentDocs(days)` — по git/mtime, сортировка по дате.
- `searchByPathPatterns(patterns[])` — glob по operative paths.
- `keywordSearch(query)` — ripgrep / BM25-lite по содержимому (без embedding каждого фрагмента).

### 3.3 Предобработка

- Split по заголовкам markdown; freshness boost (today ×1.2, yesterday ×1.1).

### 3.4 Obsidian (optional, R7)

- `OBSIDIAN_ENABLED=false` по умолчанию; CI не зависит.
- File adapter `OBSIDIAN_VAULT_PATH` или REST read-only — дополнение Circuit A, не замена.

---

## 4. Долговременная память (LanceDB, Circuit B)

### 4.1 Хранилище

- **Default:** LanceDB embedded, path `RAG_LANCEDB_PATH=.membrana/rag/` (gitignored).
- **Optional backends:** Pinecone, pgvector через `VectorStore` interface (`RAG_VECTOR_STORE`).

### 4.2 Embeddings

- **Default model:** `text-embedding-3-small` (1536 dim, cosine).
- **Не использовать** `text-embedding-ada-002`.
- Optional: Voyage 3 Lite (`RAG_EMBEDDING_PROVIDER=voyage`).

### 4.3 Индексируемые источники

- `docs/**/*.md`, root `*.md`, `.cursorrules`, `AGENTS.md`
- `docs/archive/**`, `docs/tasks/archive/**`, `docs/prompts/*_PROMPT.md`
- Code (signatures only): `packages/core`, `packages/agenda`, `audio-engine`, `fft-analyzer` — exports + JSDoc

**Exclude:** `node_modules`, `dist`, `*.generated.ts`, binaries, logs.

### 4.4 Chunking

- ~500 tokens, overlap ~50; **собственный** markdown splitter (не LangChain).
- Code: по function/class/export blocks.
- Metadata: `source`, `type`, `timestamp`, `tags`, `priority`, `chunkIndex`, `isHistorical`, `status`.

### 4.5 Индексация

- `yarn rag:index --full` — полная переиндексация.
- `yarn rag:index:incremental` — hash manifest `.membrana/rag/file-hashes.json`.
- После `archive:daily-day` — non-blocking incremental (evening ritual).

---

## 5. Двухконтурный retriever

### 5.1 `retrieveContext(query, options?)`

1. **Circuit A:** operative search → до 10 fragments, score (BM25 / keyword).
2. **Sufficiency:** if `count(score > RAG_OPERATIVE_RELEVANCE_THRESHOLD) >= RAG_MIN_OPERATIVE_COUNT` and not `useLongTerm` → skip Circuit B.
3. **Circuit B:** LanceDB vector search topK=5 (one query embedding).
4. **Merge:** apply `RAG_LONG_TERM_PENALTY` (0.9) to archive hits; freshness decay; sort; take `topK` (default 5).

### 5.2 Options

| Option | Effect |
|--------|--------|
| `useLongTerm: true` | Force Circuit B (consilium default) |
| `historical: true` | Boost archive priority |
| `topK` | Override fragment count |
| `minOperativeCount` | Override threshold count |

### 5.3 Overrides

- CLI `--full-rag` / consilium: `useLongTerm: true`, topK=8.
- `--no-rag`: fallback to current file reads.

---

## 6. Интеграция с ритуалами

| Ritual | RAG usage |
|--------|-----------|
| Morning (standup, main-day-issue) | `retrieveContext("вчера, блокеры, фокус")` + **git context** |
| Evening | after `archive:daily-day` → `yarn rag:index:incremental` |
| code-review | RAG «architecture risks 7d» + git diff |
| consilium | default `useLongTerm: true` |
| yarn ask | `--rag`; vesnin/ozhegov on by default |

**Fallback:** без keys / без index → текущее поведение (no regression).

---

## 7. Зависимости (v1)

**`@membrana/rag-service`:**

- `@lancedb/lancedb` (embedded store)
- `glob`, `gray-matter` (optional frontmatter)
- OpenAI SDK or fetch для embeddings (no LangChain)

**Не в v1:** `pinecone-client`, `@langchain/*` (optional R7 backends only).

---

## 8. Env vars

См. полный список в [`CRITICAL_RAG_AUDIT.md`](./CRITICAL_RAG_AUDIT.md) §9.

---

## 9. Скрипты (package.json)

```json
"rag:query": "node scripts/rag-query.mjs",
"rag:index": "yarn workspace @membrana/rag-service index --full",
"rag:index:incremental": "yarn workspace @membrana/rag-service index --incremental"
```

---

## 10. Этапы (summary)

| Phase | Content |
|-------|---------|
| R0 | Package scaffold, types, stub query |
| R1 | LanceDB + full/incremental index + embedder + splitter |
| R2 | Repo operative circuit |
| R3 | Dual retriever + tests |
| R4 | office `/api/rag/query` |
| R5 | Ritual integration |
| R6 | Bootstrap + docs closure |
| R7 | Optional: Obsidian, Pinecone/pgvector, Voyage A/B, reranker |

---

## 11. Критерии приёмки

- [ ] 5 acceptance questions → correct `source` in top-5
- [ ] `yarn standup:dry` works **without** embedding keys (fallback)
- [ ] Incremental index no duplicates
- [ ] p95 query < 3s local / < 5s with embeddings
- [ ] CI green without Pinecone/Obsidian
- [ ] `docs/RAG.md` + package README

---

## 12. Дальнейшее развитие

- Local embeddings (BGE-M3, эшелон 1)
- Cross-encoder reranker
- Auto-promote consilium conclusions → `docs/archive/` + index
- Read-only RAG status in client (post-v1)
