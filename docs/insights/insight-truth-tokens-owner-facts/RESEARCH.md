# Research: Токены правды: владельческие факты как источник истины для ритуала

> Источник: perplexity-api

## Q1 — Landscape

**Запрос:** как в 2025–2026 решают «стареющие факты» в системах, где решения принимает LLM поверх документов — decision records с TTL, fact stores с expiry, assertion-with-provenance, truth maintenance systems? Что из этого пережило контакт с продом, а что осталось статьёй? Отдельно: практики публичного отзыва утверждений (errata, retraction notices) и их влияние на доверие внешнего читателя.

**Выжимка:**

В 2025–2026 годах в продакшене доминирует **гибридная стратегия: TTL для быстро меняющихся данных (кэш, метрики) и версионирование документов для стабильных фактов**, что позволило отойти от концепции «стареющих фактов» как проблемы внутренней памяти модели к проблеме управления контекстом и кэша.

### Что пережило контакт с продом, а что осталось статьёй

| Архитектурный подход | Состояние в продакшене (2025–2026) | Ключевые ограничения и решения |
| :--- | :--- | :--- |
| **Decision records с TTL** | **Раждает в виде семантического кэширования**. Применяется не для «записей решений» как истины, а для предотвращения повторной генерации ответов на актуальные вопросы с ограниченным сроком жизни. | Простой TTL выдаёт устаревшие ответы; используют гибридные стратегии: TTL + версионирование документа и event-driven invalidation (инвалидация по событиям обновления факта) [5][7]. |
| **Fact stores с expiry** | **Широко используется в векторных БД (например, Milvus)**, где сущности удаляются физически после истечения срока. | Используется для временных данных (логирование, сессии); не применяется для «настоящих воспоминаний» и устойчивых фактов, так как TTL обнуляет ценный опыт [3][9]. |
| **Assertion-with-provenance** | **Стал обязательным стандартом (защитные барьеры)**. Модели требуют оценивать уверенность (score 1–5) и явно флаговать устаревшие данные, а не просто «указывать устаревшие части» [1][5]. | Система требует внешнего источника доказательств: если модель не знает контекст (например, факт устарел), она должна это отметить, а не выдумать [1]. |
| **Truth maintenance systems** | **Остался преимущественно академическим/статья**. Полная система автоматического поддержания истины (как в классических логических системах) не внедрена в LLM-агенты, так как LLM не хранят факты, а хранят веса связей [2][11]. | Вместо самообновляемой базы истины используют **внешние базы знаний** (API, SQL, графы знаний) и **тонкую настройку (RL)** для обновления закодированных фактов [2]. |

### Практики публичного отзыва утверждений (Errata, Retraction Notices)

В 2025–2026 годах внедрение публичных механизмов отзыва (retraction) напрямую влияет на доверие внешнего читателя, особенно в системах, где решения принимаются LLM поверх документов:

1.  **Механика отзыва**:
    *   При обновлении базы знаний (добавление новых фактов, исправление ошибок) система должна автоматически **инвалидировать кэшированные ответы**, связанные с устаревшими чанками [7].
    *   Вместо скрытого исправления, современные системы добавляют в ответ **явный сигнал актуальности**: «Этот факт мог устареть» или оценка уверенности по каждому пункту [1].
    *   В семантических кэшах используются guardrails (барьеры), которые принудительно отвергают низкоконфидентные иexpired (просроченные) записи, не позволяя им попасть пользователю [5].

2.  **Влияние на доверие**:
    *   **Прозрачность повышает надежность**: Пользователь, видя, что система признала ошибку или устаревание факта (errata), оценивает систему как более надежную, чем система, которая «молча» выдавает ложь.
    *   **Риск «алцгеймера»**: Если система не имеет механизма консолидации памяти и версионирования, она может «забывать» прошлые исправления, выдавая старые ошибочные данные, что подрывает доверие [6].
    *   **Отсутствие скрытых ошибок**: Event-driven invalidation предотвращает ситуацию, где пользователь получает неверный или неполный ответ из устаревшего кэша, что критично для доверия в бизнес-системах [7].

### Технологический консенсус 2026
*   **LLM не хранят факты**: Они хранят веса связей, поэтому управление «стареющими фактами» происходит не через обновление внутренней памяти модели, а через **внешнюю подачу контекста** (RAG, внешние базы знаний) и **контроль кэша** [11].
*   **Критика RAG**: Долгий контекст не заменяет память из-за эффекта «Lost in the Middle» и обрезки истории; поэтому используется **долговременная память** с выделением (пользовательские предпочтения, проверенные факты) и фильтрацией устаревших данных [3][8].
*   **Статистический подход**: Вместо логического «truth maintenance» используется **оценка уверенности** и **сигналы свежести** (recency) в запросе, что позволяет модели адаптироваться к нестационарным вопросам без переобучения [1].

Вывод: В продакшене живы **TTL-кэши с версионированием** и **assumption-with-provenance** (оценка уверенности), а **полные системы поддержания истины** и **fact stores с простым expiry для постоянных знаний** остаются непрактичными или академическими. Публичный отзыв (retraction) реализуется через явные сигналы актуальности и автоматическую инвалидацию кэша, что критически важно для доверия.

## Q2 — Fit

**Запрос:** software team uses an LLM agent to generate daily plans and reports from repository documents. They want a small store of human-asserted facts — decisions, deadlines, priorities — that no automated check can derive. The team already has automated verification: code-symbol existence checks, a drift-detection snapshot system, benchmark provenance metadata. Question: should a human-decision store be a separate module or folded into the existing check tooling? Is git-versioned JSON reviewed via pull request sufficient, or is a database needed — at what scale does the trade-off flip? How do teams keep a new decision store from becoming another ignored artifact, like a snapshot nobody refreshes? Look for: architecture decision record tooling (log4brains, adr-tools, MADR), assumption registers, knowledge-base staleness patterns, docs-as-code registries in CI.

**Выжимка:**

A human-decision store should be a **separate module** (a dedicated `docs/adr/` or `decisions/` folder) folded into the existing **docs-as-code** workflow rather than merged into automated check tooling, because human assertions (deadlines, priorities) lack the structural determinism required for code-symbol or drift-detection checks.

### Architecture: Separate Module vs. Folded Tooling
**Recommendation:** Keep the store as a **separate module** (a Git-versioned directory) that the automated tools *read from*, but do not *own*.
*   **Why separate:** Automated verification (symbol existence, drift snapshots) relies on binary, machine-derived truths. Human decisions (e.g., "Priority is Q3 despite bug") are non-deterministic and require semantic review. Merging them into the same tooling creates a "single player" bottleneck where human nuance is forced into rigid schema validation, leading to the "ignored artifact" problem [1][2].
*   **Integration pattern:** The LLM agent should query this store as a **context source** during plan generation, while automated checks treat it as a **reference** for validating drift (e.g., "Does the code match the *Accepted* decision?") [3].

### Storage Format: Git-JSON vs. Database
**Recommendation:** **Git-versioned Markdown (ADR)** reviewed via pull request is sufficient for most teams; a database is **not** needed until the scale exceeds **human reviewability**.
*   **Sufficient Scale:** Git-versioned Markdown (using tools like **log4brains**, **adr-tools**, or **MADR**) is the industry standard for Architecture Decision Records (ADRs) because it preserves history, enables diffing, and integrates with existing CI/CD workflows [1][2][11].
*   **The Trade-off Flip:** The trade-off flips to a database when:
    1.  **Query Complexity:** You need to query by *dynamic attributes* (e.g., "find all decisions with priority 'High' across 50 repos") that Git’s flat file search cannot efficiently handle.
    2.  **Concurrency:** You have >10 teams writing simultaneously and need transactional locking to prevent PR conflicts.
    3.  **Volume:** The store exceeds ~500 records, making manual "readout" reviews and onboarding navigation impractical without an index or search API [3][12].
*   **Format Note:** Use **Markdown** over JSON. Markdown is easier for humans to read, review in PRs, and diff; JSON is opaque and harder to maintain manually [11][12].

### Preventing Staleness: Keeping the Store Alive
To avoid becoming an "ignored snapshot," teams must operationalize the store through **CI enforcement** and **onboarding integration**:
*   **CI/Docs-as-Code Integration:**
    *   **Automated Readiness:** Enforce a CI rule that any code change affecting an architecture area must link to an *Accepted* ADR, or fail the build [1][9].
    *   **Staleness Triggers:** Add a "liveness check" to your CI pipeline that flags decisions older than a set period (e.g., 1 year) or those marked `Proposed` for >30 days, requiring a review [3].
*   **Operational Use (The "Why"):**
    *   **Onboarding:** Mandate that new engineers read key ADRs in their first week [11].
    *   **Change Reviews:** Require that any proposal to change a component must first consult the existing ADR to understand trade-offs and consequences [3][11].
    *   **Supersede, Don't Edit:** Never edit an accepted decision. If a decision changes, create a *new* ADR that supersedes the old one, preserving the historical rationale [3][10][12].

### Summary of Best Practices for Your Team
| Aspect | Recommendation | Tooling/Pattern |
| :--- | :--- | :--- |
| **Module** | Separate directory (`docs/adr/`) | Git repo, not check tool |
| **Format** | Markdown (ADR) | MADR, Log4brains, adr-tools |
| **Review** | Pull Request (PR) | GitHub/GitLab workflows [1] |
| **Scale Limit** | ~500 records / <10 teams | Switch to DB if >500 records |
| **Anti-Staleness** | CI linkage + Onboarding | "Link to ADR" build rule [11] |

By treating the decision store as **living documentation** (docs-as-code) rather than a static database, the team ensures the LLM agent has access to high-fidelity human context without introducing the maintenance overhead of a new database system.

## Q3 — Risk

**Запрос:** empirical evidence on decay and abandonment of architecture decision records (ADR), assumption registers and engineering decision logs: what fraction go stale, how fast, and why teams stop maintaining them. Which mechanisms empirically keep them current — CI gates that fail the build, mandatory review cadence, expiry dates, PR templates, ownership assignment — and which are known to fail? Specifically: what works when the reminder step is skippable/non-blocking? Second: cost/benefit of a recurring human curation step versus the value of a curated decision log — when does it stop paying off? Third: known failure mode where a decision record is used to entrench a contested choice and bypass team review — governance safeguards against that (RFC process, review boards, supersede-only rules).

**Выжимка:**

There is **no empirical evidence** in the provided search results regarding the decay, abandonment, or maintenance mechanisms of **Architecture Decision Records (ADRs)**, **assumption registers**, or **engineering decision logs** in software engineering.

The search results provided are unrelated to the user's query:
*   Result [1] discusses **Alternative Dispute Resolution (ADR)** programs in the context of **legal litigation and appellate courts**, analyzing settlement likelihood and disposition time, not software architecture [1].
*   Result [2] is a **European Commission report** on consumer protection entities and accessibility principles, not engineering decision logs [2].

Because the provided sources do not contain the requested data, I cannot answer:
*   The **fraction of ADRs that go stale** or the **speed of abandonment**.
*   The **reasons teams stop maintaining** them.
*   The empirical effectiveness of specific **maintenance mechanisms** (e.g., CI gates, expiry dates, mandatory reviews).
*   The **cost/benefit threshold** where human curation stops paying off.
*   **Governance safeguards** against entrenching contested choices.

To obtain accurate answers on these specific software engineering topics, you would need to consult sources such as:
*   Academic papers on software documentation maintenance (e.g., from IEEE, ACM, or FSE conferences).
*   Industry reports from organizations like the **Google Engineering Practices** team, **Amazon**, or **Microsoft** regarding their internal ADR processes.
*   Community surveys like the **State of DevOps Report** or specific studies on "technical debt" and "documentation rot."

If you can provide search results specifically focused on **software architecture decision records** or **engineering decision logs**, I can synthesize that information for you.
