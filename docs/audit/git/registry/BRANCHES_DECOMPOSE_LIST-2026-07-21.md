# BRANCHES_DECOMPOSE_LIST — Scenario A registry

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Base | origin/main |
| Base SHA | 944d1172af75e53ad53ce3960d217f40396e3b6d |
| Fetch | yes |
| Current branch | docs/audit-git-container-followup |
| Source | yarn repo:branches:decompose |
| Purpose | branch-assortment-sprint Ф1 (#803) |
| Sprint | branch-assortment-sprint (#801) |

# repo:branches:decompose — 7 hygiene categories

base: origin/main · fetch: yes · current: docs/audit-git-container-followup · gh open-PR: yes

## Taxonomy (first match wins)

| # | Category | Rule |
| --- | --- | --- |
| 1 | Worktree-активные | Worktree=yes или текущая ветка сессии — не трогать. |
| 2 | Персоны | ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete. |
| 3 | Baseline / sync-якоря | `main` или `base/*` — якоря синхронизации. |
| 4 | Доставка в полёте | Head открытого GitHub PR (нужен `gh`; иначе категория пуста). |
| 5 | Эксперимент leftover | Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*. |
| 6 | Застой / zombie | ahead==0 vs origin/main, либо remote night-triage/claude без open PR. |
| 7 | Salvage | Остаток с ahead>0 и без open PR — спасти коммиты до чистки. |

Sort: default behind DESC · cat.4 PR# DESC · cat.7 ahead DESC.
Remote twin skipped when local exists (no double-count).
Not for auto-delete. Personas never auto-delete. Use `yarn repo:clean` only after human ok.

_Skipped remote twins with local counterpart: 13_

## Summary

| Category | Local | Remote | Total |
| --- | --- | --- | --- |
| 1. Worktree-активные | 7 | 0 | 7 |
| 2. Персоны | 2 | 0 | 2 |
| 3. Baseline / sync-якоря | 5 | 0 | 5 |
| 4. Доставка в полёте | 4 | 2 | 6 |
| 5. Эксперимент leftover | 5 | 1 | 6 |
| 6. Застой / zombie | 0 | 0 | 0 |
| 7. Salvage | 21 | 1 | 22 |

## 1. Worktree-активные

Worktree=yes или текущая ветка сессии — не трогать.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| fix/adr-0013-accepted | 53 | 39 | diverged | worktree=yes | keep — active |
| truth/crystallization-20-07-worktree | 0 | 39 | behind-only | worktree=yes | keep — active |
| tooling/meeting-consilium-voice | 0 | 14 | behind-only | worktree=yes | keep — active |
| developer-rhythm-lifecycle | 1 | 2 | diverged | worktree=yes | keep — active |
| docs/audit-git-container-followup | 1 | 2 | diverged | worktree + current | keep — active |
| feat/pl-r3-boundary | 1 | 0 | ahead-only | worktree=yes | keep — active |
| feature/sbc-s1-registry | 2 | 0 | ahead-only | worktree=yes | keep — active |

## 2. Персоны

ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| ozhegov | 6 | 1246 | diverged | persona branch (canon) | never auto-delete |
| dynin | 0 | 486 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-якоря

`main` или `base/*` — якоря синхронизации.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 43 | behind-only | base/* sync anchor | keep — anchor |
| base/cursor | 0 | 43 | behind-only | base/* sync anchor | keep — anchor |
| base/product | 0 | 43 | behind-only | base/* sync anchor | keep — anchor |
| base/tooling | 0 | 43 | behind-only | base/* sync anchor | keep — anchor |
| main | 0 | 0 | sync | main baseline | keep — anchor |

## 4. Доставка в полёте

Head открытого GitHub PR (нужен `gh`; иначе категория пуста).

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night-hunt/graph-drift-1784622639476 | 1 | 23 | diverged | open PR #759 | wait PR |
| origin/night-hunt/services-api-drift-1784545232727 | 1 | 67 | diverged | open PR #709 | wait PR |
| feat/skill-truth-crystallization | 7 | 239 | diverged | open PR #575 | wait PR |
| docs/insight-truth-tokens-asset | 1 | 239 | diverged | open PR #574 | wait PR |
| chore/graphify-public-graph | 3 | 271 | diverged | open PR #525 | wait PR |
| docs/board-refactor-update | 2 | 278 | diverged | open PR #517 | wait PR |

## 5. Эксперимент leftover

Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 849 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 8 | 722 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 9 | 722 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 448 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 448 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 1 | 271 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. Застой / zombie

ahead==0 vs origin/main, либо remote night-triage/claude без open PR.

_none_

## 7. Salvage

Остаток с ahead>0 и без open PR — спасти коммиты до чистки.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| sprint/ritual-step-manifest-sf | 17 | 126 | diverged | ahead>0, no open PR | salvage commits first |
| feat/truth-graph-core | 15 | 239 | diverged | ahead>0, no open PR | salvage commits first |
| feat/fft-last-chance | 5 | 1052 | diverged | ahead>0, no open PR | salvage commits first |
| linear-tasks-gear | 4 | 32 | diverged | ahead>0, no open PR | salvage commits first |
| background-office | 3 | 1261 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-decompose | 3 | 23 | diverged | ahead>0, no open PR | salvage commits first |
| feature/device-board-exec-sequence-ux | 3 | 822 | diverged | ahead>0, no open PR | salvage commits first |
| chore/tasks-audit-archive-sweep | 2 | 32 | diverged | ahead>0, no open PR | salvage commits first |
| docs/epic-truth-graph-contour | 2 | 239 | diverged | ahead>0, no open PR | salvage commits first |
| feat/pl-r2-vocabulary | 2 | 2 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/feat/pl-r1-home | 1 | 4 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/storm/branch-taxonomy-2026-07-21 | 1 | 15 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-insight-lifecycle-canon | 1 | 89 | diverged | ahead>0, no open PR | salvage commits first |
| docs/angelina-hostess-meeting | 1 | 32 | diverged | ahead>0, no open PR | salvage commits first |
| docs/stitch-tasks-audit-canon | 1 | 27 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-audit-container | 1 | 21 | diverged | ahead>0, no open PR | salvage commits first |
| feature/scripts-boundary-container | 1 | 2 | diverged | ahead>0, no open PR | salvage commits first |
| origin/integration/pre-tj-live-79 | 1 | 1084 | diverged | ahead>0, no open PR | salvage commits first |
| vesnin/chore/procedural-layer-sprint-start | 1 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| vesnin/fix/consilium-premises-gate | 1 | 9 | diverged | ahead>0, no open PR | salvage commits first |
| vesnin/meeting/procedural-layer | 1 | 10 | diverged | ahead>0, no open PR | salvage commits first |
| vesnin/meeting/procedural-layer-m2a | 1 | 8 | diverged | ahead>0, no open PR | salvage commits first |
