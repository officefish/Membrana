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
| Operative only | Works **without** embeddings key |
| Archive / `--full-rag` | Requires embeddings key + `yarn rag:index --full` |
| `RAG_REPO_ROOT` | Override monorepo root (office / scripts) |

### Embeddings-провайдер (Issue #425)

| Env | Значение |
|-----|----------|
| `RAG_EMBEDDING_PROVIDER` | `openai` (default) \| `voyage` |
| `OPENAI_API_KEY` | ключ для `openai` (учитывается `OPENAI_BASE_URL` — можно указать OpenAI-совместимый endpoint) |
| `VOYAGE_API_KEY` / `VOYAGEAI_API_KEY` | ключ для `voyage` (алиас — имя из .env владельца) |
| `RAG_EMBEDDING_MODEL` | переопределение модели; дефолт per-provider: `text-embedding-3-small` / `voyage-3.5-lite` |

**Правило пересборки:** размерность вектора фиксируется в индексе моделью.
Смена провайдера ИЛИ модели ⇒ обязательный `yarn rag:index --full` (старый индекс
несовместим по размерности; тихой миграции нет).

**Прокси (voyage):** прямой TLS-хендшейк Node к `api.voyageai.com` может резаться
DPI по отпечатку (2026-07-13: curl/PowerShell проходят, Node — 403 HTML). При
установленных `HTTPS_PROXY`/`HTTP_PROXY` эмбеддер сам ходит через `undici
ProxyAgent`; без них — прямой fetch (office/чистые сети).

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
| Voyage embeddings provider | ✅ shipped (#425) |
| R7 (Obsidian, Pinecone) | optional / planned |
