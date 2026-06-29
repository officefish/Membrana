# Scorecard — comp-mvp-async-v2-2026-06-25

> Phase 4 closed 2026-06-25. Шкала 1–5. C1 по document/DoD; F7 deferred (см. [`PHASE_2B_GATE.md`](./PHASE_2B_GATE.md)).

| ID | Критерий | Weight |
|----|----------|--------|
| C1 | Соответствие brief / DoD (document) | 1.5 |
| C2 | Архитектура и границы пакетов | 2.0 |
| C3 | Тестируемость и CI (verify-async-v2) | 1.5 |
| C4 | UX / operator clarity | 1.5 |
| C5 | Maintainability (functions) | 1.5 |
| C6 | Risk / tech debt | 1.0 |
| **C7** | **Async clarity** (non-blocking upload + detached report) | **1.5** |

**Consilium:** [`competition-sprint-comp-mvp-async-v2-2026-06-25-consilium.md`](../../discussions/competition-sprint-comp-mvp-async-v2-2026-06-25-consilium.md)

---

## Ballot — Vesnin (Teamlead) — 2026-06-25

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 4 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 4 |
| C4 | 5 | 3 | 5 |
| C5 | 4 | 5 | 3 |
| C6 | 3 | 4 | 4 |
| C7 | 5 | 3 | 4 |

**Rank:** 1. Beta 2. Alpha 3. Gamma  
**Rationale:** Modularity + CI; C7 split alpha/gamma.

**Weighted:** Alpha 44 · Beta **44** · Gamma 42

---

## Ballot — Ozhegov (Структурщик) — 2026-06-25

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 4 | 4 |
| C2 | 3 | 5 | 3 |
| C3 | 4 | 5 | 4 |
| C4 | 4 | 2 | 4 |
| C5 | 4 | 5 | 3 |
| C6 | 3 | 4 | 3 |
| C7 | 4 | 5 | 4 |

**Rank:** 1. Beta 2. Alpha 3. Gamma  
**Rationale:** `fn-beta-async-upload-pipeline` = reusable async template.

**Weighted:** Alpha 39 · Beta **45.5** · Gamma 35.5

---

## Ballot — Dynin (Математик) — 2026-06-25

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 4 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 5 |
| C4 | 4 | 3 | 4 |
| C5 | 3 | 5 | 3 |
| C6 | 3 | 3 | 4 |
| C7 | 5 | 4 | 4 |

**Rank:** 1. Beta 2. Alpha 3. Gamma  
**Rationale:** verify-async-v2 + pack test = measurable acceptance.

**Weighted:** Alpha 41 · Beta **43.5** · Gamma 40

---

## Ballot — Музыкант — 2026-06-25

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 3 | 3 |
| C2 | 4 | 4 | 3 |
| C3 | 4 | 4 | 4 |
| C4 | 5 | 2 | 3 |
| C5 | 4 | 4 | 3 |
| C6 | 3 | 4 | 4 |
| C7 | 5 | 3 | 3 |

**Rank:** 1. Alpha 2. Beta 3. Gamma  
**Rationale:** Visible StartAsyncJob + Act IIb audio causality.

**Weighted:** Alpha **44** · Beta 34.5 · Gamma 34.5

---

## Ballot — Rodchenko (Верстальщик) — 2026-06-25

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 3 | 4 |
| C2 | 3 | 4 | 3 |
| C3 | 3 | 5 | 4 |
| C4 | 3 | 2 | 5 |
| C5 | 3 | 4 | 2 |
| C6 | 4 | 4 | 5 |
| C7 | 4 | 3 | 5 |

**Rank:** 1. Gamma 2. Beta 3. Alpha  
**Rationale:** Poster ①–⑥ best 30-sec async explain.

**Weighted:** Alpha 34.5 · Beta 36 · Gamma **41**

---

## Weighted totals (sum of 5 ballots)

| Place | Team | Score | Δ to #1 |
|-------|------|-------|---------|
| **1** | **beta** | **203.5** | — |
| 2 | alpha | 202.5 | −1.0 |
| 3 | gamma | 193.0 | −10.5 |

**Winner:** Team **Beta** (Ozhegov + Dynin + Vesnin tie-break)  
**Tie-break:** Vesnin — modularity + `fn-beta-async-upload-pipeline` для catalog; cherry-pick alpha C7 visibility + gamma ⑤⑥ в polish PR.

---

## Per-criterion averages (all jury)

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4.0 | 3.6 | 3.6 |
| C2 | 3.6 | **4.8** | 3.4 |
| C3 | 3.8 | **4.8** | 4.2 |
| C4 | **4.2** | 2.4 | **4.0** |
| C5 | 3.6 | **4.6** | 2.8 |
| C6 | 3.2 | 3.8 | **4.0** |
| C7 | **4.6** | 3.6 | **4.0** |

Beta dominates C2/C3/C5; Alpha wins C7 avg; Gamma splits C4 with Alpha.
