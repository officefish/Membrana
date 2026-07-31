# repo:branches:decompose — 7 hygiene categories

## Meta

| Field | Value |
| --- | --- |
| Date | `2026-07-31 09:47:19 +03:00` |
| Base | `origin/main` |
| Base SHA | `665a605fe612858245c7f774ed07a60fa1367881` |
| Fetch | yes |
| Current branch | `codex/branch-hygiene-salvage-2026-07-31` |
| Source | `yarn repo:branches:decompose` |
| Excluded by owner | `ritual/day-2026-07-30`, `ritual/evening-2026-07-29` |

base: origin/main · fetch: yes · current: codex/branch-hygiene-salvage-2026-07-31 · gh open-PR: yes

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

_Skipped remote twins with local counterpart: 27_

## Summary

| Category | Local | Remote | Total |
| --- | --- | --- | --- |
| 1. Worktree-активные | 15 | 0 | 15 |
| 2. Персоны | 1 | 0 | 1 |
| 3. Baseline / sync-якоря | 5 | 0 | 5 |
| 4. Доставка в полёте | 0 | 0 | 0 |
| 5. Эксперимент leftover | 24 | 1 | 25 |
| 6. Застой / zombie | 20 | 11 | 31 |
| 7. Salvage | 89 | 97 | 186 |

## 1. Worktree-активные

Worktree=yes или текущая ветка сессии — не трогать.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/archive-tw-v1-v2 | 2 | 313 | diverged | worktree=yes | keep — active |
| docs/night-cap-2026-07-21 | 3 | 313 | diverged | worktree=yes | keep — active |
| feat/closure-acceptance-gate | 2 | 313 | diverged | worktree=yes | keep — active |
| feat/membrana-leveling-adopt | 1 | 254 | diverged | worktree=yes | keep — active |
| chore/rails-idle | 0 | 224 | behind-only | worktree=yes | keep — active |
| parked/archivarius-2026-07-28 | 0 | 158 | behind-only | worktree=yes | keep — active |
| codex/llm-procedure-panel | 0 | 151 | behind-only | worktree=yes | keep — active |
| worktree-agent-ae43a2ec288ea290c | 2 | 101 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/cut-contract | 7 | 36 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/execution-gate | 7 | 36 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/experience-loop | 7 | 36 | diverged | worktree=yes | keep — active |
| storm/mfcc-sprint-test-3007 | 15 | 17 | diverged | worktree=yes | keep — active |
| chore/day-2026-07-31 | 3 | 5 | diverged | worktree=yes | keep — active |
| codex/branch-hygiene-salvage-2026-07-31 | 0 | 0 | sync | worktree + current | keep — active |
| fix/protocol-body-tail-echo-2026-07-31 | 7 | 0 | ahead-only | worktree=yes | keep — active |

## 2. Персоны

ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| dynin | 0 | 946 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-якоря

`main` или `base/*` — якоря синхронизации.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 503 | behind-only | base/* sync anchor | keep — anchor |
| base/cursor | 0 | 503 | behind-only | base/* sync anchor | keep — anchor |
| base/product | 0 | 503 | behind-only | base/* sync anchor | keep — anchor |
| base/tooling | 0 | 503 | behind-only | base/* sync anchor | keep — anchor |
| main | 0 | 1 | behind-only | main baseline | keep — anchor |

## 4. Доставка в полёте

Head открытого GitHub PR (нужен `gh`; иначе категория пуста).

_none_

## 5. Эксперимент leftover

Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 1309 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 8 | 1182 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 9 | 1182 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 908 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 908 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 1 | 731 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/canon-data | 2 | 296 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/engine-renderer | 2 | 296 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/generators-validation | 3 | 296 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/worktree-demolition-frames | 2 | 46 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/evening-ritual-door | 4 | 41 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/handoff-liveness-pr-carriers | 1 | 34 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-open | 4 | 34 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-phase1 | 6 | 30 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/repair-handoff-card-truth | 1 | 29 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/handoff-item5-truth | 1 | 26 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fix-insight-overview-empty | 1 | 25 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-phase2-close | 9 | 25 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-honest-sprint/integration | 29 | 23 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-close | 1 | 22 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/meeting-task-archive-cold-store | 2 | 19 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-cold-store-implementation | 2 | 16 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/office-task-archive-deploy-wiring | 1 | 13 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/recreate-pr-1508 | 1 | 5 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fix-task-archive-provenance | 1 | 2 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. Застой / zombie

ahead==0 vs origin/main, либо remote night-triage/claude без open PR.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| chore/close-dsp-issues | 0 | 412 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784676609787 | 1 | 405 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1784763001155 | 1 | 357 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1784849401366 | 1 | 313 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| work/2026-07-24-b | 0 | 308 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/admin-mcp/redeploy-probe-16a4424 | 0 | 298 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784935801710 | 1 | 277 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| ritual/day-2026-07-25 | 0 | 273 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| sync/origin-main | 0 | 272 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/archive-sar-w1-canon-dns | 0 | 263 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/angelina-group-hygiene-reverse | 0 | 239 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/group-hygiene-reverse | 0 | 239 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/bridge-findings-2026-07-25 | 0 | 233 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785022201300 | 1 | 231 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| feat/strategic-docs-workshop-v2 | 0 | 219 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/main-protection-followup | 0 | 183 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| probe-main | 0 | 183 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785108601542 | 1 | 177 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| chore/tooling-idle | 0 | 166 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785195001465 | 1 | 137 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| deploy/office-2026-07-28 | 0 | 103 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785281401424 | 1 | 102 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| chore/tasks-decompose-scan | 0 | 94 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/idle-2907-b | 0 | 78 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785367801147 | 1 | 53 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| docs/handoff-3007-format | 0 | 51 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tooling/idle-2026-07-30 | 0 | 49 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tooling/idle-2026-07-30-b | 0 | 42 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| meeting/workshop-wires-2026-07-30 | 0 | 33 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/weave-idle | 0 | 7 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785454201834 | 1 | 7 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |

## 7. Salvage

Остаток с ahead>0 и без open PR — спасти коммиты до чистки.

| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- |
| fix/adr-0013-accepted | 57 | 313 | diverged | ahead>0, no open PR | salvage commits first |
| sprint/ritual-step-manifest-sf | 17 | 586 | diverged | ahead>0, no open PR | salvage commits first |
| feat/truth-graph-core | 15 | 699 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/tooling-friction-2607 | 8 | 189 | diverged | ahead>0, no open PR | salvage commits first |
| storm/home-workshop | 8 | 401 | diverged | ahead>0, no open PR | salvage commits first |
| feat/skill-truth-crystallization | 7 | 699 | diverged | ahead>0, no open PR | salvage commits first |
| chore/codex-idle | 6 | 48 | diverged | ahead>0, no open PR | salvage commits first |
| feat/fft-last-chance | 5 | 1512 | diverged | ahead>0, no open PR | salvage commits first |
| fix/keep-branch-cli | 5 | 102 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-audit-concentrate | 5 | 210 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/strategic-docs-workshop | 5 | 219 | diverged | ahead>0, no open PR | salvage commits first |
| pr1410-head | 5 | 102 | diverged | ahead>0, no open PR | salvage commits first |
| feat/worktree-hygiene-f1f2 | 4 | 180 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/sprint-honest-m2 | 4 | 47 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/precedents-meta-backfill | 4 | 220 | diverged | ahead>0, no open PR | salvage commits first |
| origin/ritual/day-2026-07-26 | 4 | 229 | diverged | ahead>0, no open PR | salvage commits first |
| background-office | 3 | 1721 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-tooling-friction-2026-07-29 | 3 | 58 | diverged | ahead>0, no open PR | salvage commits first |
| chore/evening-2026-07-30 | 3 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| chore/graphify-public-graph | 3 | 731 | diverged | ahead>0, no open PR | salvage commits first |
| chore/night-triage-closure | 3 | 80 | diverged | ahead>0, no open PR | salvage commits first |
| feat/send-gate-on-path | 3 | 186 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tooling-sanitary-pack-3007 | 3 | 50 | diverged | ahead>0, no open PR | salvage commits first |
| feature/device-board-exec-sequence-ux | 3 | 1282 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/review-gate-declaration | 3 | 89 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bc-b4-weekly | 3 | 401 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/clean-runs-obstacles | 3 | 127 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/dual-mintlify-w2 | 3 | 295 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feature/kdm-d1-roots | 3 | 430 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/decompose-config-catchup | 3 | 94 | diverged | ahead>0, no open PR | salvage commits first |
| origin/meeting/bridge-command-post | 3 | 158 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-tooling-friction-2-2026-07-30 | 2 | 36 | diverged | ahead>0, no open PR | salvage commits first |
| chore/tasks-audit-archive-sweep | 2 | 492 | diverged | ahead>0, no open PR | salvage commits first |
| docs/board-refactor-update | 2 | 738 | diverged | ahead>0, no open PR | salvage commits first |
| docs/day-2907-evening-sprint-meeting | 2 | 58 | diverged | ahead>0, no open PR | salvage commits first |
| docs/epic-truth-graph-contour | 2 | 699 | diverged | ahead>0, no open PR | salvage commits first |
| feat/audit-concentrate-clean | 2 | 216 | diverged | ahead>0, no open PR | salvage commits first |
| feat/case-mechanism-friction-to-tooth | 2 | 56 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m1-verdict-2026-07-30 | 2 | 30 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-bc-b4-weekly | 2 | 392 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-bc-b5-closure | 2 | 387 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/evening-2026-07-25 | 2 | 233 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/sar-w4-closure | 2 | 251 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bc-b1-home | 2 | 414 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bc-b5-closure | 2 | 388 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/branch-protection-policy | 2 | 176 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/cases-container | 2 | 163 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/infra-policy-probe | 2 | 112 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/kdm-d4-closure | 2 | 423 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/pr-verify-fail-loud | 2 | 267 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/archivarius-hygiene-params | 2 | 106 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/llm-channels-panel-wire | 2 | 142 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/registry-broken-prompt-links | 2 | 100 | diverged | ahead>0, no open PR | salvage commits first |
| origin/meeting/bridge-command-post-r2 | 2 | 156 | diverged | ahead>0, no open PR | salvage commits first |
| origin/memory/block-migrate | 2 | 115 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/consilium-input-manifest-2026-07-30 | 2 | 47 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/consilium-input-manifest-r2-2026-07-30 | 2 | 47 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/idle-2026-07-30-c | 2 | 36 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/workspace-links-doctor-2026-07-29 | 2 | 63 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/worktree-bootstrap-canon-2026-07-29 | 2 | 58 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-procedures-corpus | 1 | 190 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-tw-v3-axes | 1 | 310 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-tw-v5-validity | 1 | 296 | diverged | ahead>0, no open PR | salvage commits first |
| chore/evening-2026-07-29 | 1 | 6 | diverged | ahead>0, no open PR | salvage commits first |
| chore/weekly-dead-wire-audit | 1 | 77 | diverged | ahead>0, no open PR | salvage commits first |
| docs/adr-0020-controlled-demolition | 1 | 54 | diverged | ahead>0, no open PR | salvage commits first |
| docs/day-2907-bridge-storm-meeting | 1 | 75 | diverged | ahead>0, no open PR | salvage commits first |
| docs/handoff-2026-07-30 | 1 | 52 | diverged | ahead>0, no open PR | salvage commits first |
| docs/handoff-3007-canon | 1 | 48 | diverged | ahead>0, no open PR | salvage commits first |
| docs/handoff-format-canon | 1 | 51 | diverged | ahead>0, no open PR | salvage commits first |
| docs/insight-recollection-pattern | 1 | 13 | diverged | ahead>0, no open PR | salvage commits first |
| docs/insight-recollection-pattern-r2 | 1 | 9 | diverged | ahead>0, no open PR | salvage commits first |
| docs/insight-truth-tokens-asset | 1 | 699 | diverged | ahead>0, no open PR | salvage commits first |
| docs/network-container-material | 1 | 76 | diverged | ahead>0, no open PR | salvage commits first |
| docs/network-howto | 1 | 72 | diverged | ahead>0, no open PR | salvage commits first |
| feat/network-container | 1 | 75 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s0-seed | 1 | 74 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s1-home | 1 | 72 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s2-resolve | 1 | 70 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s3-projection | 1 | 69 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s4-quota | 1 | 68 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s5-produce | 1 | 67 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s7-vitrine | 1 | 65 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s8-transition | 1 | 66 | diverged | ahead>0, no open PR | salvage commits first |
| feat/tariff-grid-s9-cutover | 1 | 63 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/sprint-honest-m2-r2 | 1 | 44 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m0-2026-07-30 | 1 | 32 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m1-agenda-2026-07-30 | 1 | 30 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m2-agenda-2026-07-30 | 1 | 25 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m2-verdict-2026-07-30 | 1 | 24 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m3-agenda-2026-07-30 | 1 | 21 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m3-agenda-fix-2026-07-30 | 1 | 19 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m3-verdict-2026-07-30 | 1 | 17 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m4-verdict-2026-07-30 | 1 | 16 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m5-close-2026-07-30 | 1 | 9 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m6-verdict-2026-07-30 | 1 | 15 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m7-verdict-2026-07-30 | 1 | 10 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m8-agenda-2026-07-30 | 1 | 27 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m8-verdict-2026-07-30 | 1 | 26 | diverged | ahead>0, no open PR | salvage commits first |
| meeting/workshop-wires-m9-verdict-2026-07-30 | 1 | 13 | diverged | ahead>0, no open PR | salvage commits first |
| origin/angelina/chore/archive-frame-rails-done | 1 | 236 | diverged | ahead>0, no open PR | salvage commits first |
| origin/angelina/feat/ritual-deliver-to-main | 1 | 229 | diverged | ahead>0, no open PR | salvage commits first |
| origin/angelina/fix/office-deploy-tar-force-local | 1 | 298 | diverged | ahead>0, no open PR | salvage commits first |
| origin/audit-pr-1477 | 1 | 53 | diverged | ahead>0, no open PR | salvage commits first |
| origin/audit-pr-1508 | 1 | 29 | diverged | ahead>0, no open PR | salvage commits first |
| origin/audit-pr-1511 | 1 | 26 | diverged | ahead>0, no open PR | salvage commits first |
| origin/audit-pr-1513 | 1 | 25 | diverged | ahead>0, no open PR | salvage commits first |
| origin/audit-pr-1521 | 1 | 19 | diverged | ahead>0, no open PR | salvage commits first |
| origin/audit-pr-1534 | 1 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-bc-b0-brief | 1 | 416 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-bc-b1-home | 1 | 411 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-bc-b2-specimens | 1 | 406 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-bc-b3-missing-beasts | 1 | 404 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-delivery-facts | 1 | 165 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-friction6-ship | 1 | 199 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-insight-lifecycle-canon | 1 | 549 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-kdm-d1-roots | 1 | 429 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-kdm-d2-kit | 1 | 427 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-kdm-d3-procedure | 1 | 425 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-kdm-d4-closure | 1 | 421 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-procedures-corpus-r2 | 1 | 87 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-secret-cutter | 1 | 212 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/archive-tw-v6-invariants | 1 | 288 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/bc-open-b0-done | 1 | 415 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/bridge-room | 1 | 234 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/deps-basket-card | 1 | 100 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/dreams-office-deploy-prep | 1 | 99 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/oversized-review-debt | 1 | 125 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/truth-archive-pointer | 1 | 183 | diverged | ahead>0, no open PR | salvage commits first |
| origin/chore/truth-archive-pointer-r2 | 1 | 87 | diverged | ahead>0, no open PR | salvage commits first |
| origin/docs/board-is-window-elapsed-clean | 1 | 272 | diverged | ahead>0, no open PR | salvage commits first |
| origin/docs/insight-procedures-orchestration | 1 | 229 | diverged | ahead>0, no open PR | salvage commits first |
| origin/docs/insight-server-generators-clean | 1 | 272 | diverged | ahead>0, no open PR | salvage commits first |
| origin/docs/precedent-honest-linear2 | 1 | 358 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/archivarius-codex-cursor-ingest | 1 | 147 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bc-b0-brief | 1 | 419 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bc-b2-specimens | 1 | 408 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bc-b3-missing-beasts | 1 | 405 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bridge-charter-weave | 1 | 132 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/bridge-memory-granite | 1 | 134 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/case-mining-skill | 1 | 147 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/day-memo-layers | 1 | 129 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/evidence-workshop-index | 1 | 109 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/handoff-claim | 1 | 140 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/kdm-d3-procedure | 1 | 426 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/kits-pins-prepush-strict | 1 | 175 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/linear-movement-layer-close | 1 | 216 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/memory-p4-oplog | 1 | 117 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/merge-fact-origin-main | 1 | 170 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/pr-ship-body-flags | 1 | 142 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/pr-verify-wait | 1 | 145 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/ship-merge-state-guard | 1 | 168 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/tw-state-batch-norm | 1 | 170 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feature/kdm-d2-kit | 1 | 428 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/consilium-canon-sync | 1 | 158 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/consilium-canon-sync-r2 | 1 | 86 | diverged | ahead>0, no open PR | salvage commits first |
| origin/fix/review-gate-pr-head | 1 | 88 | diverged | ahead>0, no open PR | salvage commits first |
| origin/integration/pre-tj-live-79 | 1 | 1544 | diverged | ahead>0, no open PR | salvage commits first |
| origin/meeting/memory-c2 | 1 | 123 | diverged | ahead>0, no open PR | salvage commits first |
| origin/meeting/memory-c3 | 1 | 123 | diverged | ahead>0, no open PR | salvage commits first |
| origin/night-hunt/design-drift-1784703639790 | 1 | 396 | diverged | ahead>0, no open PR | salvage commits first |
| origin/night-hunt/graph-drift-1784622639476 | 1 | 483 | diverged | ahead>0, no open PR | salvage commits first |
| origin/night-hunt/services-api-drift-1784545232727 | 1 | 527 | diverged | ahead>0, no open PR | salvage commits first |
| origin/ozhegov/feat/docs-json-navigation-object | 1 | 298 | diverged | ahead>0, no open PR | salvage commits first |
| origin/pr-1508 | 1 | 29 | diverged | ahead>0, no open PR | salvage commits first |
| origin/pr-1511 | 1 | 26 | diverged | ahead>0, no open PR | salvage commits first |
| origin/pr-1513 | 1 | 25 | diverged | ahead>0, no open PR | salvage commits first |
| origin/research/bridge-first-cases | 1 | 151 | diverged | ahead>0, no open PR | salvage commits first |
| origin/tooling/meeting-consilium-voice | 1 | 566 | diverged | ahead>0, no open PR | salvage commits first |
| ritual-xai-deploy | 1 | 298 | diverged | ahead>0, no open PR | salvage commits first |
| ritual/day-2026-07-30 | 1 | 53 | diverged | ahead>0, no open PR | salvage commits first |
| ritual/evening-2026-07-29 | 1 | 57 | diverged | ahead>0, no open PR | salvage commits first |
| skills/honest-sprint-skill | 1 | 20 | diverged | ahead>0, no open PR | salvage commits first |
| storm/team-volume-3007 | 1 | 40 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/agents-rakes-2026-07-29 | 1 | 59 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/ci-red-triage-2026-07-30 | 1 | 36 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/consilium-agenda-head-2026-07-30 | 1 | 33 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/deps-basket-reconcile-2026-07-30 | 1 | 47 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/handoff-2026-07-30 | 1 | 50 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/network-proxy-aware-2026-07-29 | 1 | 69 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/rakes-audit-install-2026-07-30 | 1 | 42 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/rebase-route-norm-2026-07-30 | 1 | 38 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/resolutions-liveness-2026-07-30 | 1 | 40 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/ship-chain-frictions-3007 | 1 | 28 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/ship-gate-selfref-2026-07-29 | 1 | 63 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/ship-with-review-2026-07-29 | 1 | 60 | diverged | ahead>0, no open PR | salvage commits first |
