# Research: Server forwarding

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** Server forwarding — server-side functions in visual workflows 2024-2026

**Выжимка:**

- Canvas node = **declarative spec**; execution в cloud (Lambda, serverless workflow, iPaaS connectors).
- Паттерн: **Task state** / server action + integration marketplace (Zapier, n8n cloud, Step Functions, UiPath API Workflows).
- Hybrid: client design, server execute; credentials в provider cloud, не в browser.
- Async job + poll/WS для long-running (Temporal-style durability опционально).

**Импликация:** `InvokeServerFunction` node → cabinet enqueue → worker; не дублировать StartAsyncJob ad hoc.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with Web Audio upload, vector RAG, background servers, INTEGRATIONS_STRATEGY

**Выжимка:**

- Client: MakeTrack → upload blob (**background-media**) → `ServerJobRef`.
- Worker: embed + zero-shot classify (open-weights tier 1); tier 2 — STT/external API via cabinet BYOK.
- **cabinet:** integrations, token ledger, job status; **office:** LLM only, no WAV.
- RAG по звукам — отдельный vector store (LanceDB/pgvector), не `yarn rag:index` docs corpus.
- Bundled functions в tariff manifest; integration functions требуют cabinet setup.

---

## Q3 — Risk

**Запрос:** risks BYOK, token billing, audio privacy, office/media boundary

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Key leakage (BYOK) | KMS, scopes, rotation, audit |
| Token bill shock | Pre-call debit, hard caps, job estimate |
| Audio PII/GDPR | Encrypt at rest, region, retention policy |
| Latency | Chunked upload to media; async node output |
| office/media mix | BACKGROUND_SERVERS boundary enforcement |
| Micro-actions cost | One server job per track window, not per tick |

---

*Источник: Perplexity MCP*
