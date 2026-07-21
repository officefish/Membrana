# История пушей / имён веток — 2026-07-21

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Sprint | `branch-assortment-sprint` Ф1 (#803) |
| Sample | 500 merged PR (`gh pr list --state merged --limit 500`) |
| Base SHA (registry) | `944d1172` |
| Related | [`branch-taxonomy-retrospective-2026-07-21.md`](./branch-taxonomy-retrospective-2026-07-21.md) |

Факты для ассортимента. **Не** рецепт чистки и **не** Scenario B.

## Префиксы (первый сегмент имени)

| Count | Prefix | Ось |
|------:|--------|-----|
| 197 | `feat` | kind |
| 68 | `chore` | kind |
| 56 | `fix` | kind |
| 51 | `docs` | kind |
| 23 | `feature` | kind-дубль (Р4: вне словаря) |
| 17 | `night` | формат / freeze-тег |
| 10 | `codex` | агент (вне канона Р4) |
| 7 | `developer-rhythm-lifecycle` | long-lived |
| 7 | `claude` | агент |
| 7 | `techies68` | legacy |
| 6 | `truth` | формат |
| 6 | `sprint` | формат |
| 5 | `vesnin` | персона-грамматика |
| ≤4 | `tooling`, `meeting`, `research`, `night-hunt`, `cursor`, `angelina`, `cowork`, `comp`, … | формат / персона / агент |

Из последних 200 merged (ось по s0): type≈146 · format≈28 · persona≈6 · agent≈6 · other≈14.

## Живая грамматика Р4 (уже в main / локальных следах)

Примеры: `angelina/storm/branch-taxonomy-2026-07-21`, `angelina/feat/pl-r1-home`,
`vesnin/meeting/procedural-layer`, `vesnin/chore/procedural-layer-sprint-start`,
`vesnin/fix/consilium-premises-gate`.

## Open PR (снимок соседей + registry cat.4, вечер 21.07)

| PR | Branch |
|----|--------|
| #799 | `feature/sbc-s1-registry` (worktree Membrana-grok; в cat.1) |
| #759 | `night-hunt/graph-drift-…` |
| #709 | `night-hunt/services-api-drift-…` |
| #575 | `feat/skill-truth-crystallization` |
| #574 | `docs/insight-truth-tokens-asset` |
| #525 | `chore/graphify-public-graph` |
| #517 | `docs/board-refactor-update` |

`#798` `feat/pl-r2-vocabulary` — merged в main (`944d1172`); локальный twin может остаться в salvage.

## Hygiene Summary (тот же вечер, Scenario A)

| Cat | Total |
|-----|------:|
| 1 Worktree | 7 |
| 2 Персоны | 2 |
| 3 Baseline | 5 |
| 4 In-flight PR | 6 |
| 5 Leftover | 6 |
| 6 Zombie | 0 |
| 7 Salvage | 22 |

Источник membership: [`registry/BRANCHES_DECOMPOSE_LIST.md`](../registry/BRANCHES_DECOMPOSE_LIST.md).
