# Dual-circuit RAG v1 — Closure (R0–R6)

| Поле | Значение |
|------|----------|
| **Epic** | `rag-dual-circuit-v1` |
| **Closed (code/docs)** | 2026-06-21 |
| **Stack** | repo operative (BM25 + git) + LanceDB + `text-embedding-3-small` |
| **Branch** | `feat/rag-dual-circuit-r0` (stacked PRs per Teamlead) |

---

## Delivered (R0–R6)

| Phase | Id | Deliverable |
|-------|-----|-------------|
| R0 | `rag-r0-scaffold` | `@membrana/rag-service`, types, `yarn rag:query` |
| R1 | `rag-r1-lancedb-index` | LanceDB store, splitter, OpenAI embedder, full/incremental index |
| R2 | `rag-r2-operative` | `operative/*` — git recency, path filters, BM25-lite |
| R3 | `rag-r3-retriever` | Dual retriever, thresholds, 5 acceptance tests (keyword corpus CI) |
| R4 | `rag-r4-office-api` | `POST /api/rag/query`, `BACKGROUND_SERVERS.md` exception + security |
| R5 | `rag-r5-rituals` | standup, main-day-issue, code-review, consilium, ask, evening hook |
| R6 | `rag-r6-closure` | This doc, operator guide, AGENTS/CONTRIBUTING/DEVELOPER_RHYTHM |

---

## Operator guide

Canonical: [`docs/RAG.md`](../RAG.md)

### Without `OPENAI_API_KEY` (works today)

- Operative circuit in rituals (`yarn standup:dry`, `yarn code-review`, `yarn ask vesnin`)
- `yarn rag:query "<question>"` — BM25 over recent `docs/` (no LanceDB archive)

### With `OPENAI_API_KEY` (one-time bootstrap)

```bash
# .env — never commit
OPENAI_API_KEY=sk-...

yarn workspace @membrana/rag-service build
yarn rag:index --full          # ~500–800 chunks → .membrana/rag/
yarn rag:query "background-office port" -- --full-rag
```

Evening: `yarn ritual:evening` runs incremental index after `archive:daily-day` (non-blocking; skips on failure).

Office (optional): `yarn office:dev` + `POST /api/rag/query` with `X-Membrana-Token` — see `docs/RAG.md`.

---

## Acceptance benchmark

| # | Question | Expected source | CI (keyword corpus) |
|---|----------|-----------------|---------------------|
| 1 | background-office/media ports | `BACKGROUND_SERVERS.md` | ✅ |
| 2 | Web Audio ban | `ARCHITECTURE.md` / `.cursorrules` | ✅ |
| 3 | Task closure M/L | `TASK_CLOSURE_REGULATION.md` | ✅ |
| 4 | Night Build stop | `NIGHT_SPRINT_REGULATION.md` | ✅ |
| 5 | audio-engine plugins | `INTEGRATIONS_STRATEGY.md` | ✅ |

Live LanceDB P@5: run after `yarn rag:index --full` with key (not required for CI).

---

## Deferred (explicit)

| Item | When |
|------|------|
| `yarn rag:index --full` on shared `techies68` | After operator adds `OPENAI_API_KEY` |
| `yarn task:archive rag-r0…rag-r6` | Per [`TASK_CLOSURE_REGULATION.md`](../prompts/TASK_CLOSURE_REGULATION.md) |
| GitHub Issues for epic/subtasks | Teamlead batch |
| **R7** optional (Obsidian, Pinecone, Voyage, reranker) | Separate tasks — `rag-r7-optional` stays active |
| CI: `rag-service` in `scheduled-ci.yml` | Follow-up PR (optional) |

---

## Key paths

| Artifact | Path |
|----------|------|
| Package | `packages/services/rag/` |
| Ritual helper | `scripts/lib/rag-ritual.mjs` |
| Index (gitignored) | `.membrana/rag/` |
| Audit / decisions | [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md) |
| Consilium plan | [`discussions/rag-strategy-implementation-plan-2026-06-21-consilium.md`](../discussions/rag-strategy-implementation-plan-2026-06-21-consilium.md) |

---

*Epic rag-dual-circuit-v1 — R0–R6 code complete; archive bootstrap pending OpenAI key.*
