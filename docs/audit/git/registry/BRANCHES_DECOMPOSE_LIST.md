# BRANCHES_DECOMPOSE_LIST ? Scenario A registry

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Base | origin/main |
| Base SHA | ebba82c7840aa21fa6e94bc760392ac3463b9a89 |
| Fetch | yes |
| Current branch | chore/git-gc-cat5 |
| Source | yarn repo:branches:decompose |
| gh open-PR | yes |
| Note | Refreshed before Scenario B cat.5 ? prior snapshot base `ad474e68?` was stale vs post-#763 `origin/main` |

# repo:branches:decompose ? 7 hygiene categories

base: origin/main · fetch: yes · current: chore/git-gc-cat5 · gh open-PR: yes

## Taxonomy (first match wins)

| # | Category | Rule |
| --- | --- | --- |
| 1 | Worktree-???????? | Worktree=yes ??? ??????? ????? ?????? ? ?? ???????. |
| 2 | ??????? | ozhegov / dynin / vesnin / boyarskiy ? ??????? ?? auto-delete. |
| 3 | Baseline / sync-????? | `main` ??? `base/*` ? ????? ?????????????. |
| 4 | ???????? ? ?????? | Head ????????? GitHub PR (????? `gh`; ????? ????????? ?????). |
| 5 | ??????????? leftover | ???????? cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*. |
| 6 | ?????? / zombie | ahead==0 vs origin/main, ???? remote night-triage/claude ??? open PR. |
| 7 | Salvage | ??????? ? ahead>0 ? ??? open PR ? ?????? ??????? ?? ??????. |

Sort: default behind DESC · cat.4 PR# DESC · cat.7 ahead DESC.
Remote twin skipped when local exists (no double-count).
Not for auto-delete. Personas never auto-delete. Use `yarn repo:clean` only after human ok.

_Skipped remote twins with local counterpart: 15_

## Summary

| Category | Local | Remote | Total |
| --- | --- | --- | --- |
| 1. Worktree-???????? | 7 | 0 | 7 |
| 2. ??????? | 2 | 0 | 2 |
| 3. Baseline / sync-????? | 5 | 0 | 5 |
| 4. ???????? ? ?????? | 4 | 2 | 6 |
| 5. ??????????? leftover | 13 | 7 | 20 |
| 6. ?????? / zombie | 0 | 0 | 0 |
| 7. Salvage | 13 | 1 | 14 |

## 1. Worktree-????????

Worktree=yes ??? ??????? ????? ?????? ? ?? ???????.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/archive-insight-lifecycle-canon | 1 | 71 | diverged | worktree=yes | keep ? active |
| fix/adr-0013-accepted | 52 | 21 | diverged | worktree=yes | keep ? active |
| tooling/meeting-consilium-voice | 0 | 21 | behind-only | worktree=yes | keep ? active |
| truth/crystallization-20-07-worktree | 0 | 21 | behind-only | worktree=yes | keep ? active |
| developer-rhythm-lifecycle | 2 | 3 | diverged | worktree=yes | keep ? active |
| chore/git-gc-cat5 | 0 | 0 | sync | worktree + current | keep ? active |
| docs/patterns-containerization | 0 | 0 | sync | worktree=yes | keep ? active |

## 2. ???????

ozhegov / dynin / vesnin / boyarskiy ? ??????? ?? auto-delete.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| ozhegov | 6 | 1228 | diverged | persona branch (canon) | never auto-delete |
| dynin | 0 | 468 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-?????

`main` ??? `base/*` ? ????? ?????????????.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 25 | behind-only | base/* sync anchor | keep ? anchor |
| base/cursor | 0 | 25 | behind-only | base/* sync anchor | keep ? anchor |
| base/product | 0 | 25 | behind-only | base/* sync anchor | keep ? anchor |
| base/tooling | 0 | 25 | behind-only | base/* sync anchor | keep ? anchor |
| main | 0 | 1 | behind-only | main baseline | keep ? anchor |

## 4. ???????? ? ??????

Head ????????? GitHub PR (????? `gh`; ????? ????????? ?????).

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night-hunt/graph-drift-1784622639476 | 1 | 5 | diverged | open PR #759 | wait PR |
| origin/night-hunt/services-api-drift-1784545232727 | 1 | 49 | diverged | open PR #709 | wait PR |
| feat/skill-truth-crystallization | 7 | 221 | diverged | open PR #575 | wait PR |
| docs/insight-truth-tokens-asset | 1 | 221 | diverged | open PR #574 | wait PR |
| chore/graphify-public-graph | 3 | 253 | diverged | open PR #525 | wait PR |
| docs/board-refactor-update | 2 | 260 | diverged | open PR #517 | wait PR |

## 5. ??????????? leftover

???????? cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/comp/comp-mvp-packaging-2026-06-21/alpha | 0 | 905 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-packaging-2026-06-21/beta | 0 | 905 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-packaging-2026-06-21/gamma | 0 | 905 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 831 | diverged | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/alpha | 0 | 781 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/beta | 0 | 781 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/gamma | 0 | 781 | behind-only | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 8 | 704 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 9 | 704 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 430 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 430 | diverged | experiment/ritual leftover prefix | review leftover |
| parallel-persona-insight | 1 | 382 | diverged | experiment/ritual leftover prefix | review leftover |
| chore/ritual-day-0715 | 4 | 281 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/neuro-detection | 4 | 281 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/sample-recording | 4 | 281 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/spectrum-live | 4 | 281 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 1 | 253 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-execution-registry/lead-persona | 24 | 103 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-execution-registry/snapshot-cold-migration | 24 | 103 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-execution-registry/units-trace-measure | 24 | 103 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. ?????? / zombie

ahead==0 vs origin/main, ???? remote night-triage/claude ??? open PR.

_none_

## 7. Salvage

??????? ? ahead>0 ? ??? open PR ? ?????? ??????? ?? ??????.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| sprint/ritual-step-manifest-sf | 17 | 108 | diverged | ahead>0, no open PR | salvage commits first |
| feat/truth-graph-core | 15 | 221 | diverged | ahead>0, no open PR | salvage commits first |
| feat/fft-last-chance | 5 | 1034 | diverged | ahead>0, no open PR | salvage commits first |
| chore/git-gc-cat6 | 4 | 3 | diverged | ahead>0, no open PR | salvage commits first |
| linear-tasks-gear | 4 | 14 | diverged | ahead>0, no open PR | salvage commits first |
| background-office | 3 | 1243 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-decompose | 3 | 5 | diverged | ahead>0, no open PR | salvage commits first |
| feature/device-board-exec-sequence-ux | 3 | 804 | diverged | ahead>0, no open PR | salvage commits first |
| chore/tasks-audit-archive-sweep | 2 | 14 | diverged | ahead>0, no open PR | salvage commits first |
| docs/epic-truth-graph-contour | 2 | 221 | diverged | ahead>0, no open PR | salvage commits first |
| docs/angelina-hostess-meeting | 1 | 14 | diverged | ahead>0, no open PR | salvage commits first |
| docs/stitch-tasks-audit-canon | 1 | 9 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-audit-container | 1 | 3 | diverged | ahead>0, no open PR | salvage commits first |
| origin/integration/pre-tj-live-79 | 1 | 1066 | diverged | ahead>0, no open PR | salvage commits first |
