# Scorecard — comp-detection-alarm-2026-07-10

Веса (из брифа, дефолт): C1 1.5 · C2 2.0 · C3 1.5 · C4 1.5 · C5 1.5 · C6 1.0 (Σ 9.0).
Музыкант голосует полным весом (бриф про звук). Шкала 1–5.

## Ballot — Vesnin (Teamlead) — 2026-07-10

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 brief/DoD | 5 | 5 | 4 |
| C2 архитектура | 4 | 5 | 4 |
| C3 тесты/CI | 4 | 5 | 4 |
| C4 UX/clarity | 5 | 4 | 5 |
| C5 maintainability | 3 | 5 | 4 |
| C6 risk/debt | 3 | 4 | 5 |

**Rank:** 1. beta 2. gamma 3. alpha
**Rationale:** деривация канона + выведенные пороги = решение, дешевеющее со временем.

## Ballot — Ozhegov (Структурщик) — 2026-07-10

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 5 | 5 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 4 |
| C4 | 5 | 4 | 5 |
| C5 | 3 | 5 | 4 |
| C6 | 3 | 5 | 4 |

**Rank:** 1. beta 2. gamma 3. alpha
**Rationale:** 840 hand-authored строк Alpha — второй канон; деривация Beta — ноль дрейфа.

## Ballot — Dynin (Математик) — 2026-07-10

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 5 | 5 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 4 |
| C4 | 4 | 4 | 5 |
| C5 | 3 | 5 | 4 |
| C6 | 3 | 5 | 4 |

**Rank:** 1. beta 2. gamma 3. alpha
**Rationale:** грань порога с двух сторон + presence-гейт с тестом; пороги выведены, не угаданы.

## Ballot — Kuryokhin (Музыкант) — 2026-07-10

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 4 | 5 | 5 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 4 |
| C4 | 5 | 4 | 5 |
| C5 | 3 | 5 | 4 |
| C6 | 3 | 4 | 5 |

**Rank:** 1. beta 2. gamma 3. alpha
**Rationale:** согласованная временная сетка Beta (4с ≤ 5с, 0.5с/400мс); live-исполнимый async только у Gamma.

## Ballot — Rodchenko (Верстальщик) — 2026-07-10

| Criterion | Alpha | Beta | Gamma |
|-----------|-------|------|-------|
| C1 | 5 | 5 | 4 |
| C2 | 4 | 5 | 4 |
| C3 | 4 | 5 | 4 |
| C4 | 5 | 3 | 5 |
| C5 | 3 | 5 | 4 |
| C6 | 3 | 4 | 5 |

**Rank:** 1. beta 2. gamma 3. alpha
**Rationale:** плакат Gamma — лучший операторский опыт; Beta требует CONCEPT для чтения цифр.

## Weighted totals

Score(team) = Σ_jury Σ_criterion weight_c × score

| Team | Vesnin | Ozhegov | Dynin | Kuryokhin | Rodchenko | **Σ** |
|------|--------|---------|-------|-----------|-----------|-------|
| Alpha | 36.5 | 36.5 | 35.0 | 35.0 | 36.5 | **179.5** |
| Beta | 42.5 | 43.5 | 43.5 | 43.0 | 41.0 | **213.5** |
| Gamma | 38.5 | 37.5 | 37.5 | 39.0 | 38.5 | **191.0** |

Проверка арифметики (пример, Vesnin/Beta): 5·1.5+5·2.0+5·1.5+4·1.5+5·1.5+4·1.0 = 7.5+10+7.5+6+7.5+4 = 42.5 ✓
