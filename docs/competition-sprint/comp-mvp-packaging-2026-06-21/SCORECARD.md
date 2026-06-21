# Scorecard — comp-mvp-packaging-2026-06-21

> Phase 4 closed 2026-06-21. Шкала 1–5. C1 оценён по **canvas/DoD**; Run F1–F6 deferred (см. consilium RUN-01).

| ID | Критерий | Weight |
|----|----------|--------|
| C1 | Соответствие brief / DoD (document) | 1.5 |
| C2 | Архитектура и границы пакетов | 2.0 |
| C3 | Тестируемость и CI (verify-layout) | 1.5 |
| C4 | UX / operator clarity | 1.5 |
| C5 | Maintainability (functions) | 1.5 |
| C6 | Risk / tech debt | 1.0 |

---

## Ballot — Vesnin (Teamlead) — 2026-06-21

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 4 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 4 |
| C4 | 5 | 3 | 5 |
| C5 | 4 | 5 | 3 |
| C6 | 3 | 4 | 4 |

**Rank:** 1. Beta 2. Alpha 3. Gamma  
**Rationale:** Modularity + CI gate; merge-ready architecture.

**Weighted:** Alpha 35 · Beta **38** · Gamma 34

---

## Ballot — Ozhegov (Структурщик) — 2026-06-21

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 4 | 4 |
| C2 | 3 | 5 | 3 |
| C3 | 4 | 5 | 4 |
| C4 | 4 | 2 | 4 |
| C5 | 4 | 5 | 3 |
| C6 | 3 | 4 | 3 |

**Rank:** 1. Beta 2. Alpha 3. Gamma  
**Rationale:** Reusable function blocks; document-only boundary clean.

**Weighted:** Alpha 31.5 · Beta **36.5** · Gamma 30

---

## Ballot — Dynin (Математик) — 2026-06-21

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 4 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 5 |
| C4 | 4 | 3 | 4 |
| C5 | 3 | 5 | 3 |
| C6 | 3 | 3 | 4 |

**Rank:** 1. Beta 2. Gamma 3. Alpha  
**Rationale:** Measurable layout; verify-layout as acceptance badge.

**Weighted:** Alpha 32 · Beta **39** · Gamma 34.5

---

## Ballot — Музыкант — 2026-06-21

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 3 | 3 |
| C2 | 4 | 4 | 3 |
| C3 | 4 | 4 | 4 |
| C4 | 5 | 2 | 3 |
| C5 | 4 | 4 | 3 |
| C6 | 3 | 4 | 4 |

**Rank:** 1. Alpha 2. Beta 3. Gamma  
**Rationale:** RU audio journey; gate+trends causality in group copy.

**Weighted:** Alpha **35** · Beta 31.5 · Gamma 29.5

---

## Ballot — Rodchenko (Верстальщик) — 2026-06-21

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 3 | 4 |
| C2 | 3 | 4 | 3 |
| C3 | 3 | 5 | 4 |
| C4 | 3 | 2 | 5 |
| C5 | 3 | 4 | 2 |
| C6 | 4 | 4 | 5 |

**Rank:** 1. Gamma 2. Beta 3. Alpha  
**Rationale:** Poster ①–⑤ wins 30-sec operator test.

**Weighted:** Alpha 27.5 · Beta 33 · Gamma **32**

---

## Weighted totals (sum of 5 ballots)

| Place | Team | Score | Δ to #1 |
|-------|------|-------|---------|
| **1** | **beta** | **178** | — |
| 2 | alpha | 161 | −17 |
| 3 | gamma | 160 | −18 |

**Winner:** Team **Beta** (Ozhegov + Dynin)  
**Tie-break:** Vesnin — modularity wins for long-term UserCase catalog; gamma/alpha ideas → cherry-pick in polish PR.

---

## Per-criterion averages (all jury)

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4.0 | 3.6 | 3.6 |
| C2 | 3.6 | **4.8** | 3.4 |
| C3 | 3.8 | **4.8** | 4.2 |
| C4 | **4.2** | 2.4 | **4.2** |
| C5 | 3.6 | **4.6** | 2.8 |
| C6 | 3.2 | 3.8 | **4.0** |

Beta dominates C2/C3/C5; Alpha/Gamma split C4; Run debt hurts C1 equally.
