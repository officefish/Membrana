# Research: Персистентная память и непрерывность виртуальных персон

> Источник: perplexity-api

## Q1 — Landscape

**Запрос:** Landscape: What established patterns exist in 2025-2026 for giving prompt-defined LLM personas or multi-agent role ensembles persistent identity and episodic memory across sessions - position journals, voting and decision histories, prediction-outcome calibration logs, reflection loops (Generative Agents, Reflexion, Letta/MemGPT, Mem0, Zep) - and what measurably improves multi-agent deliberation quality versus stateless role prompts?

**Выжимка:**

In 2025–2026, the dominant established pattern for granting persistent identity to LLM personas and multi-agent ensembles is the **SOUL.md** architecture—a mutable, structured markdown document loaded at boot that externalizes identity into modular components (core values, style, skills, and memory) and allows the agent to **edit its own identity file** to extend its character specification across sessions[1]. This is complemented by emerging theoretical frameworks like Anthropic’s **Persona Selection Model (PSM)**, which posits that LLMs simulate diverse personas by dynamically composing pre-trained “persona vectors” rather than relying on static prompts, enabling identity to be mediated by internal representations that persist through fine-tuning and context shifts[2][4].

For **episodic memory and reflection loops**, the landscape has converged on three interoperable mechanisms:
- **Segmented memory stores** (e.g., MemGPT, Letta, Mem0, Zep) that offload long-term context to external databases, decoupling session limits from identity continuity[1].
- **Formalized reflection loops** where agents periodically review recent behavior against their self-model, detect drift, and update their SOUL.md or self-representation to correct inconsistencies[1].
- **Calibration logs** that track prediction-outcome pairs, voting histories, and decision trails to enable **episodic calibration**—a measurable metric of how well an agent’s predictions align with actual outcomes over time, improving trust in multi-agent deliberation[1].

### What Measurably Improves Multi-Agent Deliberation?

Stateless role prompts suffer from **personality fragmentation** and lack of historical grounding. In contrast, persistent identity systems with episodic memory measurably improve deliberation quality through:

| Mechanism | Impact on Deliberation Quality | Evidence |
|-----------|-------------------------------|----------|
| **Mutability (SOUL.md editing)** | Reduces identity drift; agents adapt to novel situations while maintaining consistency | Agents that update their own soul files show 30–40% lower fragmentation in long-horizon tasks[1] |
| **Reinforcement-compensation** | Detects non-characteristic responses and nudges back to persona norms, stabilizing ensemble behavior | Short-term adaptive shifts are corrected within 1–2 turns, preventing cascading errors[1] |
| **Reflection loops** | Enables gradual long-term evolution; agents self-correct based on past decisions | Scheduled reflection improves consistency scores by 25% in benchmark evaluations[1] |
| **Prediction-outcome calibration** | Quantifies agent reliability; high-calibration agents contribute more trustworthy votes in deliberation | Calibration logs enable weighted voting where high-reliability agents have greater influence[1] |
| **Position journals & voting histories** | Provides traceable decision trails, enabling post-hoc audit and conflict resolution | Systems with voting histories resolve 20% more disagreements via historical precedent[1] |

The **Persona-Driven Method (PDM)** further demonstrates that representative personas with specific sociodemographic attributes produce **high-fidelity synthetic populations** with low distributional errors (MAE < 3%), outperforming stateless baselines in replicating real-world patterns[5]. Meanwhile, research on **temporal stability** confirms that LLM agents with detailed persona specifications maintain **stable behaviors** over time, whereas stateless prompts degrade rapidly[6].

In summary, the shift from static prompts to **mutable, structured identity files** (SOUL.md) combined with **episodic memory stores** and **formalized reflection** creates a measurable improvement in multi-agent deliberation: higher consistency, better calibration, and traceable decision-making. Theoretical advances like PSM suggest this persistence is not just architectural but rooted in the LLM’s internal **persona vectors**, which can be upweighted or downweighted by prompts, training data, or in-context examples[4].

## Q2 — Fit (Membrana)

**Запрос:** Fit (Membrana): How to deterministically distill a per-persona experience journal for LLM agent roles from existing deliberation artifacts (meeting protocols, review vote tables, retro notes) with provenance links, keep it within a strict token budget via rotation and summarization tiers, and inject it into role prompts without context bloat - plain curated Markdown files in git versus vector memory stores, and when is plain Markdown enough?

**Выжимка:**

There is no single published "Membrana" protocol or public paper titled exactly "Fit (Membrana)" that details this specific deterministic distillation pipeline; the query likely refers to a **custom internal architecture pattern** (possibly from a specific team like the "Membrana" group in a multi-agent system) or a synthesis of emerging best practices for **persona-driven LLM agents**.

However, the **deterministic distillation, token-budgeted rotation, and Markdown-vs-Vector tradeoffs** you describe are well-established in advanced agent engineering. Below is the authoritative synthesis of how to implement this pipeline, grounded in current agent design principles and persona evaluation frameworks.

### 1. Deterministic Distillation Pipeline
To convert deliberation artifacts (meeting protocols, vote tables, retro notes) into a per-persona "experience journal," use a **three-stage deterministic pipeline** that preserves provenance while abstracting noise:

| Stage | Action | Deterministic Mechanism | Provenance Link |
|-------|--------|-------------------------|-----------------|
| **Extraction** | Filter artifacts by persona relevance | Use **persona-specific tags** (e.g., `role:senior-analyst`) and **semantic filters** (e.g., extract only sentences containing the persona’s name or domain keywords) [1] | Append artifact ID + timestamp as `source: [file_name]#line_X` |
| **Summarization** | Compress into experience entries | Apply **tiered summarization**: (1) *Raw* (original text, 500 tokens), (2) *Abstract* (100-token summary), (3) *Insight* (20-token "key lesson") [2] | Link summary to original via `derived_from: [artifact_id]` |
| **Rotation** | Evict old entries to stay within budget | Use **recency + importance scoring**: Evict entries where `score = (0.6 × recency) + (0.4 × importance)` falls below threshold; keep top-N entries per persona [8] | Tag evicted entries with `evicted_at: [timestamp]` for auditability |

*Why deterministic?* Avoid probabilistic LLM summarization for the **extraction** step; use regex, keyword filtering, and fixed schema parsers. Only use LLMs for the **summarization** step, with a fixed prompt template to ensure consistency.

### 2. Token Budget Management via Rotation & Tiers
To enforce a strict token budget (e.g., 2,000 tokens per persona):

- **Tiers**: Store entries in three tiers:
  - **Tier 1 (Raw)**: Full text (up to 500 tokens) – only for critical events.
  - **Tier 2 (Abstract)**: 100-token summary – for most events.
  - **Tier 3 (Insight)**: 20-token "key lesson" – for patterns.
- **Rotation Logic**: 
  - When budget is exceeded, evict the **lowest-scored Tier 3** entry first, then Tier 2, then Tier 1.
  - Score = `recency_weight × age + importance_weight × manual_flag` [8].
- **Budget Enforcement**: Pre-calculate token count before injection; if `total_tokens + new_entry > budget`, trigger rotation.

### 3. Injection into Role Prompts Without Context Bloat
Inject the journal as a **curated Markdown block** in the agent’s role prompt, structured as:

```markdown
## Experience Journal (Persona: Senior Market Analyst)
- **Insight**: "Renewable energy policies shift quarterly; track EPA updates." [source: retro_2025_Q4.md#L42]
- **Abstract**: "Vote table showed 70% support forPolicy X; retro noted implementation delays." [source: vote_table_2025.md#L1]
```

- **Why Markdown?** It’s human-readable, git-trackable, and token-efficient (no vector overhead).
- **Avoid Bloat**: Only inject the **top 5–10 entries** (prioritized by score) per persona; do not inject the full journal.

### 4. Plain Curated Markdown (Git) vs. Vector Memory Stores
| Approach | When It’s Enough | When to Use Vectors |
|----------|------------------|---------------------|
| **Plain Markdown in Git** | ✅ Persona journal is **< 5,000 tokens**<br>✅ Entries are **static or slowly updated**<br>✅ Provenance links are **explicit file/line references**<br>✅ No need for semantic similarity search | ❌ Journal grows > 10,000 tokens<br>❌ Need to find "similar past events" by semantic meaning<br>❌ Real-time updates require async indexing |
| **Vector Memory Store** | ❌ Journal is small and structured<br>❌ Provenance is file-based | ✅ Need **semantic retrieval** (e.g., "find past votes on policy X")<br>✅ Journal is **dynamic and large**<br>✅ Cross-persona pattern detection required |

**Plain Markdown is enough when**:
- The journal is **deterministic** (no need for fuzzy search).
- Provenance is **file/line-based** (not semantic).
- Token budget is **strict and small** (< 5K tokens).
- You want **git-traceable history** for auditability [1].

**Use vectors when**:
- You need to retrieve entries by **semantic similarity** (e.g., "find all retro notes about 'delay'").
- The journal is **large and dynamic** (vectors handle embedded metadata better).
- You need **cross-agent pattern matching** (vectors can aggregate across personas).

### 5. Key Validation: PersonaGym & Agent Design
To ensure the distilled journal improves persona performance:
- Use **PersonaGym** (the first dynamic evaluation framework for persona agents) to test if the journal improves task performance on persona-specific questions [4][5].
- Apply the **Single Responsibility Principle** for agents: Ensure each persona has a **focused identity** and **narrow functional specialization** to avoid context bloat [1].
- Follow the **5-part Expert Persona framework** (Role & Goal, Knowledge Base, Tone, Constraints, Example Output) to structure the prompt injection [9].

### Summary
- **Distill deterministically** using regex/tag filtering + tiered summarization with provenance links.
- **Manage tokens** via recency/importance rotation and 3-tier storage.
- **Inject as Markdown** for small, static journals; use **vectors** only for large, dynamic, or semantically searchable journals.
- **Plain Markdown is enough** when the journal is < 5K tokens, deterministic, and git-traceable.

This pipeline ensures your per-persona experience journal is **provenance-linked, budget-compliant, and context-bloat-free**, while remaining auditable and human-readable.

## Q3 — Risk

**Запрос:** Risk: What are the failure modes of persistent persona memory for LLM agents - position ossification, self-consistency bias overriding fresh evidence, memory poisoning and drift, token-cost growth, fabricated recollections - and which mitigations (human-gated writes, provenance links, staleness TTL, explicit changed-my-mind entries, calibration scoring) are considered best practice?

**Выжимка:**

Persistent persona memory for LLM agents suffers from five primary failure modes—**semantic drift** (nuance loss via summarization), **memory hallucination** (fabricated recollections), **temporal obsolescence** (self-consistency bias overriding fresh evidence), **memory poisoning** ( malicious injection), and **index bloat** (token-cost growth)—which are best mitigated by a combination of **staleness TTL**, **provenance links**, **human-gated writes**, **explicit changed-my-mind entries**, and **calibration scoring** [1][2][4].

### Detailed Failure Modes and Mitigations

| Failure Mode | Mechanism & Manifestation | Best-Practice Mitigation |
| :--- | :--- | :--- |
| **Semantic/Procedural Drift** | Iterative summarization causes gradual loss of nuance; reinforcement of outdated workflows creates **position ossification** [1]. | **Ground Truth Anchoring**: Anchor summaries against immutable snapshots and validate periodically [1][2]. |
| **Memory Hallucination** | Retrieval of non-existent or fabricated facts leads to **fabricated recollections** [1]. | **Consistency Verifier**: Use an LLM as a judge to compare candidate memories against current context and flag inconsistencies [1][2]. |
| **Temporal Obsolescence** | Conflict between stale memories and new states causes **self-consistency bias overriding fresh evidence** [1]. | **Staleness TTL**: Implement *Weibull Decay* or time-based decay where transient info has short TTLs and immutable facts have infinite TTLs [1][4]. |
| **Memory Poisoning** | Injection of malicious instructions into storage corrupts the agent’s reasoning [1]. | **Write Filtering (Firewall)**: Apply **human-gated writes** and security scans at both write and read times (e.g., OWASP Agent Memory Guard) [1][5]. |
| **Index Bloat / Latency** | Accumulation of redundant logs causes **token-cost growth** and linear/quadratic search scaling [1]. | **Active Forgetting**: Use **utility-based deletion** and hierarchical indexing to prune below-threshold memories [1][2][6]. |

### Key Architectural Best Practices

*   **Explicit "Changed-My-Mind" Entries**: When a later interaction discovers an older memory is wrong, the system should **mark the older item as superseded** with a reason rather than merely appending a correction, preventing a pile of inconsistent advice [5].
*   **Provenance Links & ACLs**: To prevent **privacy leakage** and track fact evolution, every memory entry must include provenance links and strict access control lists (ACLs) [1][6].
*   **Selective Addition with Quality Gates**: Instead of storing every interaction, evaluate whether a new memory adds unique information, contradicts existing data (triggering an update), or meets a minimum **importance score** (recency × user confirmation × task success) [4][5].
*   **Three-Tier Compaction**: Implement progressive compaction where recent memories are verbatim, medium-age are structured summaries, and old memories are compressed to single-line digests to manage token costs [5].
*   **Scheduled Maintenance**: Run `memory_maintenance()` separately (e.g., via cron) to summarize episodic to semantic memory, purge expired entries, and resolve contradictions, rather than calling it automatically during every response [2].

Static RAG lacks the feedback loop inherent in evolving memory, where errors compound over time; therefore, **deliberate forgetting** and **contradiction handling** are critical to maintaining agent reliability [1][4].
