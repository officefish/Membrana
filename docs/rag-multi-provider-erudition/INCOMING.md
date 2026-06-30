# RAG Multi-Provider + Per-Member Erudition — evaluated requirement

**Status:** `evaluated` — multi-provider runtime implemented; per-member erudition deferred to a measured experiment
**Source:** product decision (2026-06-27)
**Canon:** [`docs/RAG.md`](../RAG.md), [`docs/CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md)

---

## Current state

The original incoming requirement mixed two independent concerns. Their current status differs:

| Concern | Current state | Decision |
|---|---|---|
| OpenAI-compatible endpoint | Implemented through `OPENAI_BASE_URL` | Keep; covered by config and request tests |
| Voyage provider | Implemented through the embedder factory | Explicit selection, no automatic runtime failover |
| Provider/model index safety | Implemented through an embedding fingerprint | Provider/model change requires `yarn rag:index --full` |
| Per-member erudition | Not implemented | Deferred experiment; does not enter RAG v1 |
| Local `nomic-embed-text` | Not implemented | Candidate only for the per-member experiment |

R0–R6 of `rag-dual-circuit-v1` are shipped. R7 remains the optional overlay phase.

## Multi-provider contract

```text
RAG_EMBEDDING_PROVIDER=openai  + OPENAI_API_KEY
RAG_EMBEDDING_PROVIDER=voyage + VOYAGE_API_KEY
```

- OpenAI defaults to `text-embedding-3-small` and supports `OPENAI_BASE_URL`.
- Voyage defaults to `voyage-4-lite`, 1024 dimensions, and sends `input_type=document|query`.
- Indexing and retrieval use the same factory and configuration.
- Automatic OpenAI → Voyage fallback is forbidden for an existing index: vectors from different
  providers/models are not interchangeable even when their dimensions happen to match.
- Incremental indexing checks `<provider>:<model>:<dimensions>` in the manifest and fails fast
  when a full rebuild is required.

## Per-member erudition: remaining hypothesis

The useful hypothesis is narrower than “five permanent LanceDB databases”:

> A role-specific corpus may improve the quality of a virtual-team answer when shared project
> context is insufficient and the role has a clearly owned knowledge domain.

Before implementation, the experiment must define:

1. A versioned corpus for every participating role. Persona prompts alone are not a knowledge corpus.
2. A baseline against the shared dual-circuit RAG.
3. At least 20 labelled questions per tested role and retrieval metrics (`precision@k`, useful-hit rate).
4. Latency and storage budgets for local Ollama + `nomic-embed-text`.
5. Isolation by `memberId` **and** embedding fingerprint; no mixed vector table.
6. A consilium integration point that remains optional and never blocks the shared RAG path.

## Proposed experiment (not an implementation task yet)

| Phase | Deliverable | Gate | Size |
|---|---|---|---|
| E0 | Corpora and 20-question benchmark for one role (Ozhegov) | Human-labelled baseline exists | S |
| E1 | Local Nomic embedder + isolated test index | No cloud key; reproducible rebuild | M |
| E2 | `memberId` routing in an experimental adapter | Shared RAG remains unchanged | M |
| E3 | Consilium A/B run | ≥10% useful-hit gain, acceptable latency | M |

If E3 misses the quality gate, reject per-member indexes and keep role specialization in prompts plus
the shared RAG corpus. Do not create five stores before E0 establishes distinct, maintainable corpora.

## Resolved questions

- **Runtime fallback or env switch?** Explicit env switch plus full rebuild.
- **One index for both providers?** No. One active fingerprint per index path.
- **Are Voyage and OpenAI vectors compatible at equal dimensions?** No compatibility assumption.
- **Does each member need a store now?** No; start with one-role evidence.
- **Does Nomic replace the main RAG?** No; experimental overlay only.

## Next decision

Teamlead may open E0 as a separate M/L task after naming the first role corpus owner and benchmark
questions. Until then this requirement is evaluated, not active implementation scope.
