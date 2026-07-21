# BRANCHES_DECOMPOSE_LIST � Scenario A registry

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Base | origin/main |
| Base SHA | ad474e688417722792a92cee05a1b1f22b7cd4ad |
| Fetch | yes |
| Current branch | chore/git-gc-cat6 |
| Source | yarn repo:branches:decompose |
| gh open-PR | yes |
# repo:branches:decompose — 7 hygiene categories

base: origin/main · fetch: yes · current: chore/git-gc-cat6 · gh open-PR: yes

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

_Skipped remote twins with local counterpart: 17_

## Summary

| Category | Local | Remote | Total |
| --- | --- | --- | --- |
| 1. Worktree-активные | 7 | 0 | 7 |
| 2. Персоны | 2 | 0 | 2 |
| 3. Baseline / sync-якоря | 4 | 0 | 4 |
| 4. Доставка в полёте | 4 | 2 | 6 |
| 5. Эксперимент leftover | 13 | 7 | 20 |
| 6. Застой / zombie | 11 | 2 | 13 |
| 7. Salvage | 11 | 1 | 12 |

## 1. Worktree-активные

Worktree=yes или текущая ветка сессии — не трогать.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/archive-insight-lifecycle-canon | 1 | 68 | diverged | worktree=yes | keep — active |
| fix/adr-0013-accepted | 52 | 18 | diverged | worktree=yes | keep — active |
| tooling/meeting-consilium-voice | 0 | 18 | behind-only | worktree=yes | keep — active |
| truth/crystallization-20-07-worktree | 0 | 18 | behind-only | worktree=yes | keep — active |
| developer-rhythm-lifecycle | 0 | 4 | behind-only | worktree=yes | keep — active |
| main | 0 | 1 | behind-only | worktree=yes | keep — active |
| chore/git-gc-cat6 | 0 | 0 | sync | worktree + current | keep — active |

## 2. Персоны

ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| ozhegov | 6 | 1225 | diverged | persona branch (canon) | never auto-delete |
| dynin | 0 | 465 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-якоря

`main` или `base/*` — якоря синхронизации.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 22 | behind-only | base/* sync anchor | keep — anchor |
| base/cursor | 0 | 22 | behind-only | base/* sync anchor | keep — anchor |
| base/product | 0 | 22 | behind-only | base/* sync anchor | keep — anchor |
| base/tooling | 0 | 22 | behind-only | base/* sync anchor | keep — anchor |

## 4. Доставка в полёте

Head открытого GitHub PR (нужен `gh`; иначе категория пуста).

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night-hunt/graph-drift-1784622639476 | 1 | 2 | diverged | open PR #759 | wait PR |
| origin/night-hunt/services-api-drift-1784545232727 | 1 | 46 | diverged | open PR #709 | wait PR |
| feat/skill-truth-crystallization | 7 | 218 | diverged | open PR #575 | wait PR |
| docs/insight-truth-tokens-asset | 1 | 218 | diverged | open PR #574 | wait PR |
| chore/graphify-public-graph | 3 | 250 | diverged | open PR #525 | wait PR |
| docs/board-refactor-update | 2 | 257 | diverged | open PR #517 | wait PR |

## 5. Эксперимент leftover

Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/comp/comp-mvp-packaging-2026-06-21/alpha | 0 | 902 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-packaging-2026-06-21/beta | 0 | 902 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-packaging-2026-06-21/gamma | 0 | 902 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 828 | diverged | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/alpha | 0 | 778 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/beta | 0 | 778 | behind-only | experiment/ritual leftover prefix | review leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/gamma | 0 | 778 | behind-only | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 8 | 701 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 9 | 701 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 427 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 427 | diverged | experiment/ritual leftover prefix | review leftover |
| parallel-persona-insight | 1 | 379 | diverged | experiment/ritual leftover prefix | review leftover |
| chore/ritual-day-0715 | 4 | 278 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/neuro-detection | 4 | 278 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/sample-recording | 4 | 278 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-free-fragment-usercases/spectrum-live | 4 | 278 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 1 | 250 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-execution-registry/lead-persona | 24 | 100 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-execution-registry/snapshot-cold-migration | 24 | 100 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-execution-registry/units-trace-measure | 24 | 100 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. Застой / zombie

ahead==0 vs origin/main, либо remote night-triage/claude без open PR.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| feat/panel-live-deploy | 0 | 313 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| verify-main | 0 | 266 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| verify-main-2 | 0 | 262 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| verify-final | 0 | 259 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| main-check | 0 | 257 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tmp-probe | 0 | 233 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| work/scratch | 0 | 227 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| feat/evening-audit-generator | 0 | 144 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| grok/worktree | 0 | 82 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784503809283 | 1 | 57 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| fix/repo-clean-root-scratch | 0 | 19 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784590210419 | 1 | 18 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| post-merge-check | 0 | 11 | behind-only | ahead==0 behind-only | repo:clean? after human ok |

## 7. Salvage

Остаток с ahead>0 и без open PR — спасти коммиты до чистки.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| sprint/ritual-step-manifest-sf | 17 | 105 | diverged | ahead>0, no open PR | salvage commits first |
| feat/truth-graph-core | 15 | 218 | diverged | ahead>0, no open PR | salvage commits first |
| feat/fft-last-chance | 5 | 1031 | diverged | ahead>0, no open PR | salvage commits first |
| linear-tasks-gear | 4 | 11 | diverged | ahead>0, no open PR | salvage commits first |
| background-office | 3 | 1240 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tasks-decompose | 3 | 2 | diverged | ahead>0, no open PR | salvage commits first |
| feature/device-board-exec-sequence-ux | 3 | 801 | diverged | ahead>0, no open PR | salvage commits first |
| chore/tasks-audit-archive-sweep | 2 | 11 | diverged | ahead>0, no open PR | salvage commits first |
| docs/epic-truth-graph-contour | 2 | 218 | diverged | ahead>0, no open PR | salvage commits first |
| docs/angelina-hostess-meeting | 1 | 11 | diverged | ahead>0, no open PR | salvage commits first |
| docs/stitch-tasks-audit-canon | 1 | 6 | diverged | ahead>0, no open PR | salvage commits first |
| origin/integration/pre-tj-live-79 | 1 | 1063 | diverged | ahead>0, no open PR | salvage commits first |

