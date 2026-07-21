# BRANCHES_DECOMPOSE_LIST — Scenario A registry

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Base | origin/main |
| Base SHA | 82fe25f98548a44acd2f6a5b9bec80b4e5590b8a |
| Fetch | no (--no-fetch; after rebase onto origin/main) |
| Current branch | chore/git-gc-cat5 |
| Source | yarn repo:branches:decompose |
| gh open-PR | yes |
| Note | Regenerated UTF-8 after code-review P1 mojibake on PR #772 |

# repo:branches:decompose — 7 hygiene categories

base: origin/main · fetch: skipped (--no-fetch) · current: chore/git-gc-cat5 · gh open-PR: yes

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
| 3. Baseline / sync-якоря | 4 | 0 | 4 |
| 4. Доставка в полёте | 4 | 2 | 6 |
| 5. Эксперимент leftover | 10 | 1 | 11 |
| 6. Застой / zombie | 0 | 0 | 0 |
| 7. Salvage | 16 | 1 | 17 |

## 1. Worktree-активные

Worktree=yes или текущая ветка сессии — не трогать.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/archive-insight-lifecycle-canon | 1 | 75 | diverged | worktree=yes | keep — active |
| fix/adr-0013-accepted | 52 | 25 | diverged | worktree=yes | keep — active |
| truth/crystallization-20-07-worktree | 0 | 25 | behind-only | worktree=yes | keep — active |
| developer-rhythm-lifecycle | 0 | 1 | behind-only | worktree=yes | keep — active |
| chore/git-gc-cat5 | 4 | 0 | ahead-only | worktree + current | keep — active |
| main | 0 | 0 | sync | worktree=yes | keep — active |
| tooling/meeting-consilium-voice | 0 | 0 | sync | worktree=yes | keep — active |

## 2. Персоны

ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| ozhegov | 6 | 1232 | diverged | persona branch (canon) | never auto-delete |
| dynin | 0 | 472 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-якоря

`main` или `base/*` — якоря синхронизации.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 29 | behind-only | base/* sync anchor | keep — anchor |
| base/cursor | 0 | 29 | behind-only | base/* sync anchor | keep — anchor |
| base/product | 0 | 29 | behind-only | base/* sync anchor | keep — anchor |
| base/tooling | 0 | 29 | behind-only | base/* sync anchor | keep — anchor |

## 4. Доставка в полёте

Head открытого GitHub PR (нужен `gh`; иначе категория пуста).

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night-hunt/graph-drift-1784622639476 | 1 | 9 | diverged | open PR #759 | wait PR |
| origin/night-hunt/services-api-drift-1784545232727 | 1 | 53 | diverged | open PR #709 | wait PR |
| feat/skill-truth-crystallization | 7 | 225 | diverged | open PR #575 | wait PR |
| docs/insight-truth-tokens-asset | 1 | 225 | diverged | open PR #574 | wait PR |
| chore/graphify-public-graph | 3 | 257 | diverged | open PR #525 | wait PR |
| docs/board-refactor-update | 2 | 264 | diverged | open PR #517 | wait PR |

## 5. Эксперимент leftover

Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 835 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 8 | 708 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 9 | 708 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 434 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 434 | diverged | experiment/ritual leftover prefix | review leftover |
| parallel-persona-insight | 1 | 386 | diverged | experiment/ritual leftover prefix | review leftover |
| chore/ritual-day-0715 | 4 | 285 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/neuro-detection | 4 | 285 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/sample-recording | 4 | 285 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/spectrum-live | 4 | 285 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 1 | 257 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. Застой / zombie

ahead==0 vs origin/main, либо remote night-triage/claude без open PR.

_none_

## 7. Salvage

Остаток с ahead>0 и без open PR — спасти коммиты до чистки.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| sprint/ritual-step-manifest-sf | 17 | 112 | diverged | ahead>0, no open PR | salvage commits first |
| feat/truth-graph-core | 15 | 225 | diverged | ahead>0, no open PR | salvage commits first |
| feat/fft-last-chance | 5 | 1038 | diverged | ahead>0, no open PR | salvage commits first |
| chore/git-gc-cat6 | 4 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| linear-tasks-gear | 4 | 18 | diverged | ahead>0, no open PR | salvage commits first |
| background-office | 3 | 1247 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-decompose | 3 | 9 | diverged | ahead>0, no open PR | salvage commits first |
| feature/device-board-exec-sequence-ux | 3 | 808 | diverged | ahead>0, no open PR | salvage commits first |
| chore/tasks-audit-archive-sweep | 2 | 18 | diverged | ahead>0, no open PR | salvage commits first |
| docs/epic-truth-graph-contour | 2 | 225 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/storm/branch-taxonomy-2026-07-21 | 1 | 1 | diverged | ahead>0, no open PR | salvage commits first |
| docs/angelina-hostess-meeting | 1 | 18 | diverged | ahead>0, no open PR | salvage commits first |
| docs/pattern-pinned-subgraph | 1 | 3 | diverged | ahead>0, no open PR | salvage commits first |
| docs/patterns-containerization | 1 | 4 | diverged | ahead>0, no open PR | salvage commits first |
| docs/stitch-tasks-audit-canon | 1 | 13 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-audit-container | 1 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| origin/integration/pre-tj-live-79 | 1 | 1070 | diverged | ahead>0, no open PR | salvage commits first |

