# repo:branches:decompose — 7 hygiene categories

base: origin/main · fetch: yes · current: codex/branch-hygiene-closeout-2026-07-31 · gh open-PR: yes

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
| 1. Worktree-активные | 15 | 0 | 15 |
| 2. Персоны | 1 | 0 | 1 |
| 3. Baseline / sync-якоря | 5 | 0 | 5 |
| 4. Доставка в полёте | 0 | 0 | 0 |
| 5. Эксперимент leftover | 27 | 1 | 28 |
| 6. Застой / zombie | 20 | 11 | 31 |
| 7. Salvage | 12 | 2 | 14 |

## 1. Worktree-активные

Worktree=yes или текущая ветка сессии — не трогать.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/archive-tw-v1-v2 | 2 | 321 | diverged | worktree=yes | keep — active |
| docs/night-cap-2026-07-21 | 3 | 321 | diverged | worktree=yes | keep — active |
| feat/closure-acceptance-gate | 2 | 321 | diverged | worktree=yes | keep — active |
| feat/membrana-leveling-adopt | 1 | 262 | diverged | worktree=yes | keep — active |
| chore/rails-idle | 0 | 232 | behind-only | worktree=yes | keep — active |
| parked/archivarius-2026-07-28 | 0 | 166 | behind-only | worktree=yes | keep — active |
| codex/llm-procedure-panel | 0 | 159 | behind-only | worktree=yes | keep — active |
| worktree-agent-ae43a2ec288ea290c | 2 | 109 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/cut-contract | 7 | 44 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/execution-gate | 7 | 44 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/experience-loop | 7 | 44 | diverged | worktree=yes | keep — active |
| storm/mfcc-sprint-test-3007 | 15 | 25 | diverged | worktree=yes | keep — active |
| feat/kit-frame-boundary-2026-07-31 | 1 | 2 | diverged | worktree=yes | keep — active |
| codex/branch-hygiene-closeout-2026-07-31 | 0 | 0 | sync | worktree + current | keep — active |
| fix/review-verdict-over-truncated-diff | 0 | 0 | sync | worktree=yes | keep — active |

## 2. Персоны

ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| dynin | 0 | 954 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-якоря

`main` или `base/*` — якоря синхронизации.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 511 | behind-only | base/* sync anchor | keep — anchor |
| base/cursor | 0 | 511 | behind-only | base/* sync anchor | keep — anchor |
| base/product | 0 | 511 | behind-only | base/* sync anchor | keep — anchor |
| base/tooling | 0 | 511 | behind-only | base/* sync anchor | keep — anchor |
| main | 0 | 0 | sync | main baseline | keep — anchor |

## 4. Доставка в полёте

Head открытого GitHub PR (нужен `gh`; иначе категория пуста).

_none_

## 5. Эксперимент leftover

Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 1317 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 8 | 1190 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 9 | 1190 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 916 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 916 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 1 | 739 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/canon-data | 2 | 304 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/engine-renderer | 2 | 304 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/generators-validation | 3 | 304 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/worktree-demolition-frames | 2 | 54 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/evening-ritual-door | 4 | 49 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/handoff-liveness-pr-carriers | 1 | 42 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-open | 4 | 42 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-phase1 | 6 | 38 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/repair-handoff-card-truth | 1 | 37 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/handoff-item5-truth | 1 | 34 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fix-insight-overview-empty | 1 | 33 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-phase2-close | 9 | 33 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-honest-sprint/integration | 29 | 31 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-close | 1 | 30 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/meeting-task-archive-cold-store | 2 | 27 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-cold-store-implementation | 2 | 24 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/office-task-archive-deploy-wiring | 1 | 21 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/recreate-pr-1508 | 1 | 13 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fix-task-archive-provenance | 1 | 10 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-salvage-2026-07-31 | 3 | 7 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-execution-2026-07-31 | 1 | 4 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/ship-chain-frictions-salvage-2026-07-31 | 1 | 3 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. Застой / zombie

ahead==0 vs origin/main, либо remote night-triage/claude без open PR.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/close-dsp-issues | 0 | 420 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784676609787 | 1 | 413 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1784763001155 | 1 | 365 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1784849401366 | 1 | 321 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| work/2026-07-24-b | 0 | 316 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/admin-mcp/redeploy-probe-16a4424 | 0 | 306 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784935801710 | 1 | 285 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| ritual/day-2026-07-25 | 0 | 281 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| sync/origin-main | 0 | 280 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/archive-sar-w1-canon-dns | 0 | 271 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/angelina-group-hygiene-reverse | 0 | 247 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/group-hygiene-reverse | 0 | 247 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/bridge-findings-2026-07-25 | 0 | 241 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785022201300 | 1 | 239 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| feat/strategic-docs-workshop-v2 | 0 | 227 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/main-protection-followup | 0 | 191 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| probe-main | 0 | 191 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785108601542 | 1 | 185 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| chore/tooling-idle | 0 | 174 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785195001465 | 1 | 145 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| deploy/office-2026-07-28 | 0 | 111 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785281401424 | 1 | 110 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| chore/tasks-decompose-scan | 0 | 102 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/idle-2907-b | 0 | 86 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785367801147 | 1 | 61 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| docs/handoff-3007-format | 0 | 59 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tooling/idle-2026-07-30 | 0 | 57 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tooling/idle-2026-07-30-b | 0 | 50 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| meeting/workshop-wires-2026-07-30 | 0 | 41 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/weave-idle | 0 | 15 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785454201834 | 1 | 15 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |

## 7. Salvage

Остаток с ahead>0 и без open PR — спасти коммиты до чистки.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| fix/adr-0013-accepted | 57 | 321 | diverged | ahead>0, no open PR | salvage commits first |
| chore/day-2026-07-31 | 14 | 4 | diverged | ahead>0, no open PR | salvage commits first |
| fix/protocol-body-tail-echo-2026-07-31 | 8 | 8 | diverged | ahead>0, no open PR | salvage commits first |
| feat/norm-in-agents-2026-07-31 | 5 | 4 | diverged | ahead>0, no open PR | salvage commits first |
| fix/keep-branch-cli | 5 | 110 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/skill-truth-crystallization | 5 | 707 | diverged | ahead>0, no open PR | salvage commits first |
| pr1410-head | 5 | 110 | diverged | ahead>0, no open PR | salvage commits first |
| chore/graphify-public-graph | 3 | 739 | diverged | ahead>0, no open PR | salvage commits first |
| feat/experience-seam-2026-07-31 | 3 | 6 | diverged | ahead>0, no open PR | salvage commits first |
| feat/invariant-tooth-2026-07-31 | 3 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| chore/register-llm-transport-card-2026-07-31 | 1 | 4 | diverged | ahead>0, no open PR | salvage commits first |
| origin/tooling/consilium-input-manifest-2026-07-30 | 1 | 56 | diverged | ahead>0, no open PR | salvage commits first |
| ritual/day-2026-07-30 | 1 | 61 | diverged | ahead>0, no open PR | salvage commits first |
| ritual/evening-2026-07-29 | 1 | 65 | diverged | ahead>0, no open PR | salvage commits first |
