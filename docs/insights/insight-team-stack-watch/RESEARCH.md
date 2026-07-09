# Research: Начитанная виртуальная команда: досье персон + фоновый stack-watch за новинками стека

> Источник: perplexity-api

## Q1 — Landscape

**Запрос:** Landscape: Which established patterns and tools give LLM agents or prompt-defined "personas" persistent, continuously-updated domain knowledge without weight fine-tuning — curated knowledge dossiers, retrieval-augmentation (RAG), scheduled research digests, agent-memory systems, continuous-learning loops — and what actually works in 2025–2026, with typical architectures and their limitations?

**Выжимка:**

The established patterns that give LLM agents continuous, persistent domain knowledge without weight fine-tuning are **retrieval-augmented generation (RAG)**, **long-term memory systems** (episodic/semantic dictionaries), and **curated knowledge dossiers** integrated via external vector databases, with **RAG combined with persistent episodic memory** being the most effective architecture in 2025–2026 [1][4][6].

### What Actually Works in 2025–2026: Core Architectures

| Architecture | Key Mechanism | Why It Works | Limitations |
| :--- | :--- | :--- | :--- |
| **RAG + Persistent Memory** | Combines real-time document retrieval with saved interaction records (task, observation, action) updated via reinforcement learning [1] | Enables reasoning over past successes/failures without retraining parameters; supports dynamic updates [1][4] | Requires robust vector DB infrastructure; retrieval may select irrelevant data in multi-modal contexts [5][7] |
| **Multi-Level Memory Hierarchies** | Splits memory into Core/Episodic/Semantic/Procedural (e.g., MIRIX, MemoryOS) [1] | Human-like recall; selective retrieval enhances sequential decision-making [1] | Complex to manage at scale; summarizing context without errors remains challenging [4] |
| **Curated Knowledge Dossiers** | Pre-indexed domain-specific code/rules (e.g., Physics-Agnostic pattern) [3] | Flexible, up-to-date reference docs avoid full retraining costs [5] | Limited autonomy; requires human oversight for iterative refinement [3] |
| **Agent-Memory Systems (Git-Context)** | Versioned hierarchy (commit/branch/merge) for interaction history [1] | Secure, traceable multi-session applications; selective retrieval [1] | High latency (50–200ms for retrieval); potential for memory poisoning attacks [8] |

### Typical Architectures & Their Limitations

*   **Reference Architecture (RAG + Codified Rules):** Uses a request classifier to route queries to RAG for domain-specific code generation, complemented by expert rules [3].
    *   *Limitation:* Limited dynamic knowledge integration; relies on user feedback for learning [3].
*   **Runtime Verification (RvLLM):** Incorporates domain knowledge via a general specification language to detect misbehavior [2].
    *   *Limitation:* LLMs remain prone to low-level errors due to lack of formal guarantees during inference [2].
*   **Multi-Agent Systems:** Orchestrates domain-expert agents (DXA) to ingest and act on domain data [5].
    *   *Limitation:* Cost implications (3–10x difference vs. single agents); complex pipelines for multi-modal extensions [5][8].

### Critical Challenges in Production

*   **Long-Term Memory Complexity:** Storing and retrieving relevant context without overwhelming the agent is harder than short-term memory; summarization errors scale with data volume [4].
*   **Context Length & Incomplete Info:** Agents fail when pushed beyond finite context windows or forced to reason with incomplete information [4][6].
*   **Security & Poisoning:** Memory systems face threats from memory poisoning attacks and require enterprise-grade prompt injection defense [8].
*   **Latency:** Knowledge retrieval adds 50–200ms latency, impacting real-time performance [8].

In essence, **RAG augmented with persistent episodic memory** (e.g., REMEMBERER architecture) is the dominant solution for 2025–2026, offering the ability to learn from experience without fine-tuning [1], though it demands rigorous vector database management and security safeguards to mitigate retrieval errors and memory poisoning [5][8].

## Q2 — Fit (Membrana)

**Запрос:** Fit (Membrana): How to inject such knowledge into prompt-defined roles deterministically, without context bloat and without hallucinated "news" — splitting curated token-budgeted dossiers vs an on-demand RAG tail, deduplication and staleness/TTL of knowledge, distillation strictly from provided sources with URL+date provenance, and cheap regular monitoring of stack releases/papers (arXiv, HuggingFace, GitHub releases, changelogs) on a ritual or cron cadence?

**Выжимка:**

To deterministically inject knowledge into prompt-defined roles without context bloat or hallucination, you must **decouple the role definition (prompt) from the knowledge source (RAG/Cache)**, explicitly constraining the model to answer **only from provided context** and requiring **URL+date provenance** for every claim.

### 1. Deterministic Role Injection & Anti-Hallucination Strategy
*   **Define Roles by Function, Not Persona:** Instead of vague personas like “Act as an expert,” assign roles based on **skills and constraints** (e.,g., “You are a system that extracts facts from the provided text and rejects anything outside it”) [3][5]. Overly elaborate personas add noise; concise, task-relevant definitions are more effective [3].
*   **Strict Context Boundaries:** Explicitly instruct the model to **answer only from the provided context** and show examples of questions it must refuse if the answer is not present [6][8]. This prevents the model from inventing “news” or relying on internal training data [7].
*   **Provenance Enforcement:** Require the model to **quote the source** for every fact, ensuring it points to evidence rather than inventing one [8]. This aligns with the principle of distilling strictly from provided sources [1].
*   **Output Contracts:** For reliable reasoning, replace personas with **measurable output requirements** enforced by a rigorous output contract (e.,g., “If no URL is found, output ‘UNKNOWN’”) [7].

### 2. Knowledge Architecture: Curated Dossiers vs. On-Demand RAG
*   **Hybrid Strategy:** Split knowledge into two tiers:
    *   **Curated Token-Budgeted Dossiers:** Pre-compute high-confidence, static knowledge (e.,g., core architecture docs, finalized changelogs) into compact prompt snippets. This minimizes latency and token usage for frequent queries.
    *   **On-Demand RAG Tail:** Use Retrieval-Augmented Generation for dynamic, low-frequency, or rapidly changing data (e.,g., recent arXiv papers, live GitHub releases). This avoids bloating the prompt with stale or irrelevant data.
*   **Deduplication & Staleness (TTL):** Implement a **TTL (Time-To-Live)** mechanism for the RAG index. Stale entries (e.,g., changelogs older than 6 months for non-critical stacks) are automatically pruned or moved to the “curated” archival tier to ensure freshness [1].
*   **Distillation Pipeline:** Before indexing, distill raw data (papers, releases) into **structured snippets** containing only the essential fact, the **URL**, and the **date**. This ensures the RAG returns only verified, provenanced data [1].

### 3. Monitoring Cadence & Monitoring Stack
*   **Ritual/Cron Cadence:** Set up a **cron job** (e.,g., daily at 00:00 UTC) to scrape specific sources:
    *   **arXiv:** Filter for new papers matching specific keywords (e.,g., “LLM prompting,” “RAG optimization”).
    *   **HuggingFace/GitHub:** Monitor release tags and changelogs for updates to key libraries (e.,g., `langchain`, `vllm`).
    *   **Changelogs:** Parse official documentation for breaking changes.
*   **Cheap Regular Monitoring:** Use lightweight scripts to parse release metadata (version, date, summary) without downloading full payloads, then feed only the **metadata + link** into the RAG tail. This keeps the monitoring cost low while maintaining up-to-date coverage [1].

### 4. Implementation Checklist
| Component | Action |
| :--- | :--- |
| **Prompt** | “Act as a fact-extractor. Use ONLY the provided text. Cite URL and Date for every claim. If unknown, say ‘UNKNOWN’.” [3][5] |
| **Role** | Define by **function** (e.,g., “Data Validator”) not **demographic** [5]. |
| **RAG** | Index only **distilled snippets** with `URL+Date` metadata; prune via **TTL** [1]. |
| **Monitoring** | **Cron job** daily to scrape releases/papers; parse only metadata; inject new links into RAG [1]. |
| **Validation** | Require **source quoting** to prevent hallucination [8]. |

By separating the **static role definition** from the **dynamic knowledge retrieval**, and enforcing strict **provenance and context boundaries**, you achieve deterministic, bloat-free role injection that avoids hallucinated “news.” [1][3][7][8]

## Q3 — Risk

**Запрос:** Risk: What are the failure modes of automatically feeding knowledge to an agent team — hallucinated, stale, or contradictory facts, knowledge drift, over-trust in the digest, token-cost blowup, noise vs signal — and what mitigations (human-in-the-loop gate, provenance/citations, item caps, dedup, knowledge TTL) are considered best practice?

**Выжимка:**

The failure modes of automatically feeding knowledge to an agent team include **hallucinated cascades**, **stale (rotten) facts**, **contradictory answers**, **knowledge drift**, **inter-agent over-trust**, **token-cost blowups**, and **noise overwhelming signal**, while best-practice mitigations are **human-in-the-loop (HitL) gates**, **provenance/citations**, **item caps**, **deduplication**, and **knowledge TTL (time-to-live)** [3][4][5][7].

### Core Failure Modes
When agents ingest automatically generated knowledge, they face specific risks that diverge from standard model errors:

*   **Hallucination Cascades:** Agents generate false information and immediately use that fabrication to inform subsequent decisions, creating a chain reaction that amplifies errors across the system [3].
*   **Stale Facts (Context Rot):** Knowledge becomes outdated over time, leading to silent degradation where agents act on incorrect baselines (e.g., "approval-routing agent suddenly gets zero responses") [4][7].
*   **Contradictory Answers:** Fragmented or missing enterprise context causes agents to produce conflicting outputs or violate compliance policies [7].
*   **Inter-Agent Trust Escalation:** Agents may blindly trust the digest or outputs from peers without validation, leading to "description laundering" or the propagation of tampered state [5].
*   **Token-Cost Blowup:** Unbounded memory writes or excessive context compaction can lead to runaway token usage and "bad handoff" artifacts that critical state [2].
*   **Noise vs. Signal:** Agents suffer from "default-fill slop" where unspecified parts of a task are filled with mediocre defaults, or "context contamination" where irrelevant data dilutes the signal [1][2].

### Best-Practice Mitigations
To prevent these failures, organizations should implement architectural governance rather than behavioral constraints:

| Mitigation Strategy | How It Works |
| :--- | :--- |
| **Human-in-the-Loop (HitL) Gate** | Enforces deterministic approval with tiered requirements that scale with action reversibility, resisting "YOLO mode" bypasses and approval fatigue [5][6]. |
| **Provenance & Citations** | Logs exactly when, why, and by whom a memory fragment was written, using cryptographic signatures so agents refuse to read tampered state [3]. |
| **Item Caps** | Limits the volume of context to prevent token blowups and "context anxiety," ensuring agents don't overload on partial data [2]. |
| **Deduplication** | Removes redundant entries to prevent "structured output pressure" and ensures the agent sees a clean, unified view of facts [2]. |
| **Knowledge TTL** | Implements **drift detection** to flag context staleness before it causes silent degradation, requiring scheduled refreshes of "Business-as-Code" artifacts [4]. |

### Strategic Implementation
The most effective defense begins with **standardized protocols** (explicit JSON schemas, role contracts) and a **centralized control plane** that enforces policies before execution [3].
*   **Schema Validation:** Catches hallucinated data (e.g., malformed zip codes) before it reaches any system [4].
*   **Scoped Tool Access:** Using MCP (Model Context Protocol) prevents agents from acting beyond their mandate by removing tools they don't need [4].
*   **Explicit Rejection Logging:** Agents should log when they discard input due to constraints (e.g., "received X, discarded due to Y") rather than silently failing [8].
*   **Context Reset:** Regularly refreshing context prevents long-task drift and "context rotation" [2].

Failure modes like "agentic supply chain compromise" and "goal hijacking" require system-level testing and multi-step attack evaluation, not just model-level tuning [5].
*   **Drift Detection:** Track agent decision patterns over time to flag behavior divergence from baselines [4].
*   **Versioned Memory:** Allows rolling back to the last known-good snapshot if corruption occurs [3].

By treating every memory write as untrusted until validated, systems can prevent the "quiet degradation" that often diverges from test performance [1][3].
*   **Semantic Validators:** Compare candidate entries against policy and historical context before any write persists [3].
*   **Defensive MCP Servers:** Validate tool invocations at the integration layer to block scope creep [4].

This layered approach ensures that governance is architectural, preventing agents from improvising or acting beyond their defined mandates [4].
*   **Confidence Scoring:** Stops cascading errors from propagating at pipeline checkpoints [4].
*   **Redundant Message Channels:** Adds resilience against drift and communication breakdowns [3].

Ultimately, the goal is to limit what actions agents may take, set stop conditions, and monitor for bypass patterns [6].
*   **Task Boundaries:** Prevent agents from expanding their own execution path when prompts are ambiguous [6].
*   **Zero-Click HitL Bypass:** Requires system-level testing to prevent zero-click bypass chains in session contexts [5].

These measures address the "missing layer" where agents fail not because of the model, but due to inadequate context and governance [9].

> _[Обрезано] Ответ Perplexity по Q3 далее выродился в повторение одного и того же
> блока про governance (schema validation / scoped MCP / drift detection / HitL) ~15 раз —
> артефакт деградации модели, не новая фактура. Суть Q3 полностью выше._
