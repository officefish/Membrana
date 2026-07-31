# repo:branches — inventory vs origin/main

fetch: yes · current: codex/branch-hygiene-salvage-2026-07-31 · local: 154 · remote: 136

ahead = `rev-list --count origin/main..BRANCH` · behind = `rev-list --count BRANCH..origin/main`

Do **not** use `git branch --merged` (squash lies). Persona branches are never auto-deleted — see `yarn repo:clean`.

## Local branches

| Branch | Ahead | Behind | Bucket | Current | Worktree |
| --- | --- | --- | --- | --- | --- |
| background-office | 3 | 1721 | diverged |  |  |
| feat/fft-last-chance | 5 | 1512 | diverged |  |  |
| feature/device-board-exec-sequence-ux | 3 | 1282 | diverged |  |  |
| codex/task-archive-migration-sprint | 9 | 1182 | diverged |  |  |
| codex/fv1-s2-content | 8 | 1182 | diverged |  |  |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 908 | diverged |  |  |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 908 | diverged |  |  |
| docs/board-refactor-update | 2 | 738 | diverged |  |  |
| chore/graphify-public-graph | 3 | 731 | diverged |  |  |
| night/graphify-public-graph-2026-07-15 | 1 | 731 | diverged |  |  |
| feat/truth-graph-core | 15 | 699 | diverged |  |  |
| feat/skill-truth-crystallization | 7 | 699 | diverged |  |  |
| docs/epic-truth-graph-contour | 2 | 699 | diverged |  |  |
| docs/insight-truth-tokens-asset | 1 | 699 | diverged |  |  |
| sprint/ritual-step-manifest-sf | 17 | 586 | diverged |  |  |
| chore/tasks-audit-archive-sweep | 2 | 492 | diverged |  |  |
| storm/home-workshop | 8 | 401 | diverged |  |  |
| fix/adr-0013-accepted | 57 | 313 | diverged |  |  |
| docs/night-cap-2026-07-21 | 3 | 313 | diverged |  | yes |
| chore/archive-tw-v1-v2 | 2 | 313 | diverged |  | yes |
| feat/closure-acceptance-gate | 2 | 313 | diverged |  | yes |
| chore/archive-tw-v3-axes | 1 | 310 | diverged |  |  |
| cowork/cowork-strategic-docs-container/generators-validation | 3 | 296 | diverged |  |  |
| ritual-xai-deploy | 1 | 298 | diverged |  |  |
| cowork/cowork-strategic-docs-container/canon-data | 2 | 296 | diverged |  |  |
| cowork/cowork-strategic-docs-container/engine-renderer | 2 | 296 | diverged |  |  |
| chore/archive-tw-v5-validity | 1 | 296 | diverged |  |  |
| feat/membrana-leveling-adopt | 1 | 254 | diverged |  | yes |
| feat/audit-concentrate-clean | 2 | 216 | diverged |  |  |
| chore/archive-procedures-corpus | 1 | 190 | diverged |  |  |
| feat/send-gate-on-path | 3 | 186 | diverged |  |  |
| feat/worktree-hygiene-f1f2 | 4 | 180 | diverged |  |  |
| fix/keep-branch-cli | 5 | 102 | diverged |  |  |
| pr1410-head | 5 | 102 | diverged |  |  |
| worktree-agent-ae43a2ec288ea290c | 2 | 101 | diverged |  | yes |
| chore/night-triage-closure | 3 | 80 | diverged |  |  |
| chore/weekly-dead-wire-audit | 1 | 77 | diverged |  |  |
| docs/network-container-material | 1 | 76 | diverged |  |  |
| docs/day-2907-bridge-storm-meeting | 1 | 75 | diverged |  |  |
| feat/network-container | 1 | 75 | diverged |  |  |
| feat/tariff-grid-s0-seed | 1 | 74 | diverged |  |  |
| docs/network-howto | 1 | 72 | diverged |  |  |
| feat/tariff-grid-s1-home | 1 | 72 | diverged |  |  |
| feat/tariff-grid-s2-resolve | 1 | 70 | diverged |  |  |
| feat/tariff-grid-s3-projection | 1 | 69 | diverged |  |  |
| tooling/network-proxy-aware-2026-07-29 | 1 | 69 | diverged |  |  |
| feat/tariff-grid-s4-quota | 1 | 68 | diverged |  |  |
| feat/tariff-grid-s5-produce | 1 | 67 | diverged |  |  |
| feat/tariff-grid-s8-transition | 1 | 66 | diverged |  |  |
| feat/tariff-grid-s7-vitrine | 1 | 65 | diverged |  |  |
| tooling/workspace-links-doctor-2026-07-29 | 2 | 63 | diverged |  |  |
| feat/tariff-grid-s9-cutover | 1 | 63 | diverged |  |  |
| tooling/ship-gate-selfref-2026-07-29 | 1 | 63 | diverged |  |  |
| chore/archive-tooling-friction-2026-07-29 | 3 | 58 | diverged |  |  |
| tooling/ship-with-review-2026-07-29 | 1 | 60 | diverged |  |  |
| docs/day-2907-evening-sprint-meeting | 2 | 58 | diverged |  |  |
| tooling/agents-rakes-2026-07-29 | 1 | 59 | diverged |  |  |
| tooling/worktree-bootstrap-canon-2026-07-29 | 2 | 58 | diverged |  |  |
| feat/case-mechanism-friction-to-tooth | 2 | 56 | diverged |  |  |
| ritual/evening-2026-07-29 | 1 | 57 | diverged |  |  |
| docs/adr-0020-controlled-demolition | 1 | 54 | diverged |  |  |
| chore/codex-idle | 6 | 48 | diverged |  |  |
| ritual/day-2026-07-30 | 1 | 53 | diverged |  |  |
| docs/handoff-2026-07-30 | 1 | 52 | diverged |  |  |
| feat/tooling-sanitary-pack-3007 | 3 | 50 | diverged |  |  |
| cowork/cowork-honest-sprint/integration | 29 | 23 | diverged |  |  |
| docs/handoff-format-canon | 1 | 51 | diverged |  |  |
| meeting/sprint-honest-m2 | 4 | 47 | diverged |  |  |
| tooling/handoff-2026-07-30 | 1 | 50 | diverged |  |  |
| docs/handoff-3007-canon | 1 | 48 | diverged |  |  |
| tooling/consilium-input-manifest-2026-07-30 | 2 | 47 | diverged |  |  |
| tooling/consilium-input-manifest-r2-2026-07-30 | 2 | 47 | diverged |  |  |
| codex/worktree-demolition-frames | 2 | 46 | diverged |  |  |
| tooling/deps-basket-reconcile-2026-07-30 | 1 | 47 | diverged |  |  |
| codex/evening-ritual-door | 4 | 41 | diverged |  |  |
| meeting/sprint-honest-m2-r2 | 1 | 44 | diverged |  |  |
| cowork/cowork-honest-sprint/cut-contract | 7 | 36 | diverged |  | yes |
| cowork/cowork-honest-sprint/execution-gate | 7 | 36 | diverged |  | yes |
| cowork/cowork-honest-sprint/experience-loop | 7 | 36 | diverged |  | yes |
| tooling/rakes-audit-install-2026-07-30 | 1 | 42 | diverged |  |  |
| storm/team-volume-3007 | 1 | 40 | diverged |  |  |
| tooling/resolutions-liveness-2026-07-30 | 1 | 40 | diverged |  |  |
| tooling/rebase-route-norm-2026-07-30 | 1 | 38 | diverged |  |  |
| chore/archive-tooling-friction-2-2026-07-30 | 2 | 36 | diverged |  |  |
| cowork/honest-sprint-open | 4 | 34 | diverged |  |  |
| tooling/idle-2026-07-30-c | 2 | 36 | diverged |  |  |
| tooling/ci-red-triage-2026-07-30 | 1 | 36 | diverged |  |  |
| cowork/honest-sprint-phase1 | 6 | 30 | diverged |  |  |
| codex/handoff-liveness-pr-carriers | 1 | 34 | diverged |  |  |
| cowork/honest-sprint-phase2-close | 9 | 25 | diverged |  |  |
| tooling/consilium-agenda-head-2026-07-30 | 1 | 33 | diverged |  |  |
| meeting/workshop-wires-m0-2026-07-30 | 1 | 32 | diverged |  |  |
| meeting/workshop-wires-m1-verdict-2026-07-30 | 2 | 30 | diverged |  |  |
| storm/mfcc-sprint-test-3007 | 15 | 17 | diverged |  | yes |
| meeting/workshop-wires-m1-agenda-2026-07-30 | 1 | 30 | diverged |  |  |
| codex/repair-handoff-card-truth | 1 | 29 | diverged |  |  |
| tooling/ship-chain-frictions-3007 | 1 | 28 | diverged |  |  |
| meeting/workshop-wires-m8-agenda-2026-07-30 | 1 | 27 | diverged |  |  |
| codex/handoff-item5-truth | 1 | 26 | diverged |  |  |
| meeting/workshop-wires-m8-verdict-2026-07-30 | 1 | 26 | diverged |  |  |
| codex/fix-insight-overview-empty | 1 | 25 | diverged |  |  |
| meeting/workshop-wires-m2-agenda-2026-07-30 | 1 | 25 | diverged |  |  |
| meeting/workshop-wires-m2-verdict-2026-07-30 | 1 | 24 | diverged |  |  |
| cowork/honest-sprint-close | 1 | 22 | diverged |  |  |
| meeting/workshop-wires-m3-agenda-2026-07-30 | 1 | 21 | diverged |  |  |
| codex/meeting-task-archive-cold-store | 2 | 19 | diverged |  |  |
| skills/honest-sprint-skill | 1 | 20 | diverged |  |  |
| meeting/workshop-wires-m3-agenda-fix-2026-07-30 | 1 | 19 | diverged |  |  |
| codex/task-archive-cold-store-implementation | 2 | 16 | diverged |  |  |
| meeting/workshop-wires-m3-verdict-2026-07-30 | 1 | 17 | diverged |  |  |
| meeting/workshop-wires-m4-verdict-2026-07-30 | 1 | 16 | diverged |  |  |
| meeting/workshop-wires-m6-verdict-2026-07-30 | 1 | 15 | diverged |  |  |
| codex/office-task-archive-deploy-wiring | 1 | 13 | diverged |  |  |
| docs/insight-recollection-pattern | 1 | 13 | diverged |  |  |
| meeting/workshop-wires-m9-verdict-2026-07-30 | 1 | 13 | diverged |  |  |
| meeting/workshop-wires-m7-verdict-2026-07-30 | 1 | 10 | diverged |  |  |
| chore/evening-2026-07-30 | 3 | 7 | diverged |  |  |
| docs/insight-recollection-pattern-r2 | 1 | 9 | diverged |  |  |
| meeting/workshop-wires-m5-close-2026-07-30 | 1 | 9 | diverged |  |  |
| chore/day-2026-07-31 | 3 | 5 | diverged |  | yes |
| chore/evening-2026-07-29 | 1 | 6 | diverged |  |  |
| codex/recreate-pr-1508 | 1 | 5 | diverged |  |  |
| codex/fix-task-archive-provenance | 1 | 2 | diverged |  |  |
| dynin | 0 | 946 | behind-only |  |  |
| base/codex | 0 | 503 | behind-only |  |  |
| base/cursor | 0 | 503 | behind-only |  |  |
| base/product | 0 | 503 | behind-only |  |  |
| base/tooling | 0 | 503 | behind-only |  |  |
| chore/close-dsp-issues | 0 | 412 | behind-only |  |  |
| work/2026-07-24-b | 0 | 308 | behind-only |  |  |
| ritual/day-2026-07-25 | 0 | 273 | behind-only |  |  |
| sync/origin-main | 0 | 272 | behind-only |  |  |
| chore/archive-sar-w1-canon-dns | 0 | 263 | behind-only |  |  |
| chore/angelina-group-hygiene-reverse | 0 | 239 | behind-only |  |  |
| chore/group-hygiene-reverse | 0 | 239 | behind-only |  |  |
| chore/bridge-findings-2026-07-25 | 0 | 233 | behind-only |  |  |
| chore/rails-idle | 0 | 224 | behind-only |  | yes |
| feat/strategic-docs-workshop-v2 | 0 | 219 | behind-only |  |  |
| chore/main-protection-followup | 0 | 183 | behind-only |  |  |
| probe-main | 0 | 183 | behind-only |  |  |
| chore/tooling-idle | 0 | 166 | behind-only |  |  |
| parked/archivarius-2026-07-28 | 0 | 158 | behind-only |  | yes |
| codex/llm-procedure-panel | 0 | 151 | behind-only |  | yes |
| deploy/office-2026-07-28 | 0 | 103 | behind-only |  |  |
| chore/tasks-decompose-scan | 0 | 94 | behind-only |  |  |
| chore/idle-2907-b | 0 | 78 | behind-only |  |  |
| docs/handoff-3007-format | 0 | 51 | behind-only |  |  |
| tooling/idle-2026-07-30 | 0 | 49 | behind-only |  |  |
| tooling/idle-2026-07-30-b | 0 | 42 | behind-only |  |  |
| meeting/workshop-wires-2026-07-30 | 0 | 33 | behind-only |  |  |
| chore/weave-idle | 0 | 7 | behind-only |  |  |
| main | 0 | 1 | behind-only |  |  |
| fix/protocol-body-tail-echo-2026-07-31 | 7 | 0 | ahead-only |  | yes |
| codex/branch-hygiene-salvage-2026-07-31 | 0 | 0 | sync | yes | yes |

## Remote origin/*

| Branch | Ahead | Behind | Bucket | Worktree |
| --- | --- | --- | --- | --- |
| origin/background-office | 3 | 1721 | diverged |  |
| origin/integration/pre-tj-live-79 | 1 | 1544 | diverged |  |
| origin/feat/fft-last-chance | 5 | 1512 | diverged |  |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 1309 | diverged |  |
| origin/docs/board-refactor-update | 2 | 738 | diverged |  |
| origin/chore/graphify-public-graph | 1 | 731 | diverged |  |
| origin/feat/skill-truth-crystallization | 5 | 699 | diverged |  |
| origin/docs/insight-truth-tokens-asset | 1 | 699 | diverged |  |
| origin/tooling/meeting-consilium-voice | 1 | 566 | diverged |  |
| origin/fix/adr-0013-accepted | 53 | 499 | diverged |  |
| origin/chore/archive-insight-lifecycle-canon | 1 | 549 | diverged |  |
| origin/night-hunt/services-api-drift-1784545232727 | 1 | 527 | diverged |  |
| origin/night-hunt/graph-drift-1784622639476 | 1 | 483 | diverged |  |
| origin/feature/kdm-d1-roots | 3 | 430 | diverged |  |
| origin/chore/archive-kdm-d1-roots | 1 | 429 | diverged |  |
| origin/feature/kdm-d2-kit | 1 | 428 | diverged |  |
| origin/chore/archive-kdm-d2-kit | 1 | 427 | diverged |  |
| origin/feat/kdm-d3-procedure | 1 | 426 | diverged |  |
| origin/chore/archive-kdm-d3-procedure | 1 | 425 | diverged |  |
| origin/feat/kdm-d4-closure | 2 | 423 | diverged |  |
| origin/chore/archive-kdm-d4-closure | 1 | 421 | diverged |  |
| origin/feat/bc-b0-brief | 1 | 419 | diverged |  |
| origin/chore/archive-bc-b0-brief | 1 | 416 | diverged |  |
| origin/chore/bc-open-b0-done | 1 | 415 | diverged |  |
| origin/feat/bc-b1-home | 2 | 414 | diverged |  |
| origin/chore/archive-bc-b1-home | 1 | 411 | diverged |  |
| origin/docs/night-cap-2026-07-21 | 1 | 409 | diverged | yes |
| origin/feat/bc-b2-specimens | 1 | 408 | diverged |  |
| origin/chore/archive-bc-b2-specimens | 1 | 406 | diverged |  |
| origin/claude/night-triage-1784676609787 | 1 | 405 | diverged |  |
| origin/feat/bc-b3-missing-beasts | 1 | 405 | diverged |  |
| origin/chore/archive-bc-b3-missing-beasts | 1 | 404 | diverged |  |
| origin/feat/bc-b4-weekly | 3 | 401 | diverged |  |
| origin/night-hunt/design-drift-1784703639790 | 1 | 396 | diverged |  |
| origin/chore/archive-bc-b4-weekly | 2 | 392 | diverged |  |
| origin/feat/bc-b5-closure | 2 | 388 | diverged |  |
| origin/chore/archive-bc-b5-closure | 2 | 387 | diverged |  |
| origin/docs/precedent-honest-linear2 | 1 | 358 | diverged |  |
| origin/claude/night-triage-1784763001155 | 1 | 357 | diverged |  |
| origin/claude/night-triage-1784849401366 | 1 | 313 | diverged |  |
| origin/angelina/fix/office-deploy-tar-force-local | 1 | 298 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/generators-validation | 3 | 296 | diverged |  |
| origin/ozhegov/feat/docs-json-navigation-object | 1 | 298 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/canon-data | 2 | 296 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/engine-renderer | 2 | 296 | diverged |  |
| origin/feat/dual-mintlify-w2 | 3 | 295 | diverged |  |
| origin/chore/archive-tw-v6-invariants | 1 | 288 | diverged |  |
| origin/claude/night-triage-1784935801710 | 1 | 277 | diverged |  |
| origin/docs/board-is-window-elapsed-clean | 1 | 272 | diverged |  |
| origin/docs/insight-server-generators-clean | 1 | 272 | diverged |  |
| origin/feat/pr-verify-fail-loud | 2 | 267 | diverged |  |
| origin/chore/sar-w4-closure | 2 | 251 | diverged |  |
| origin/angelina/chore/archive-frame-rails-done | 1 | 236 | diverged |  |
| origin/chore/bridge-room | 1 | 234 | diverged |  |
| origin/chore/evening-2026-07-25 | 2 | 233 | diverged |  |
| origin/ritual/day-2026-07-26 | 4 | 229 | diverged |  |
| origin/claude/night-triage-1785022201300 | 1 | 231 | diverged |  |
| origin/angelina/feat/ritual-deliver-to-main | 1 | 229 | diverged |  |
| origin/docs/insight-procedures-orchestration | 1 | 229 | diverged |  |
| origin/feat/precedents-meta-backfill | 4 | 220 | diverged |  |
| origin/feat/strategic-docs-workshop | 5 | 219 | diverged |  |
| origin/feat/linear-movement-layer-close | 1 | 216 | diverged |  |
| origin/chore/archive-audit-concentrate | 5 | 210 | diverged |  |
| origin/chore/archive-secret-cutter | 1 | 212 | diverged |  |
| origin/chore/archive-friction6-ship | 1 | 199 | diverged |  |
| origin/feat/tooling-friction-2607 | 8 | 189 | diverged |  |
| origin/chore/archive-procedures-corpus | 1 | 190 | diverged |  |
| origin/feat/send-gate-on-path | 3 | 186 | diverged |  |
| origin/chore/truth-archive-pointer | 1 | 183 | diverged |  |
| origin/feat/worktree-hygiene-f1f2 | 4 | 180 | diverged |  |
| origin/claude/night-triage-1785108601542 | 1 | 177 | diverged |  |
| origin/feat/branch-protection-policy | 2 | 176 | diverged |  |
| origin/feat/kits-pins-prepush-strict | 1 | 175 | diverged |  |
| origin/feat/merge-fact-origin-main | 1 | 170 | diverged |  |
| origin/feat/tw-state-batch-norm | 1 | 170 | diverged |  |
| origin/feat/ship-merge-state-guard | 1 | 168 | diverged |  |
| origin/chore/archive-delivery-facts | 1 | 165 | diverged |  |
| origin/feat/cases-container | 2 | 163 | diverged |  |
| origin/meeting/bridge-command-post | 3 | 158 | diverged |  |
| origin/fix/consilium-canon-sync | 1 | 158 | diverged |  |
| origin/meeting/bridge-command-post-r2 | 2 | 156 | diverged |  |
| origin/research/bridge-first-cases | 1 | 151 | diverged |  |
| origin/feat/archivarius-codex-cursor-ingest | 1 | 147 | diverged |  |
| origin/feat/case-mining-skill | 1 | 147 | diverged |  |
| origin/feat/pr-verify-wait | 1 | 145 | diverged |  |
| origin/fix/llm-channels-panel-wire | 2 | 142 | diverged |  |
| origin/feat/pr-ship-body-flags | 1 | 142 | diverged |  |
| origin/feat/handoff-claim | 1 | 140 | diverged |  |
| origin/claude/night-triage-1785195001465 | 1 | 137 | diverged |  |
| origin/feat/bridge-memory-granite | 1 | 134 | diverged |  |
| origin/feat/bridge-charter-weave | 1 | 132 | diverged |  |
| origin/feat/clean-runs-obstacles | 3 | 127 | diverged |  |
| origin/feat/day-memo-layers | 1 | 129 | diverged |  |
| origin/chore/oversized-review-debt | 1 | 125 | diverged |  |
| origin/meeting/memory-c2 | 1 | 123 | diverged |  |
| origin/meeting/memory-c3 | 1 | 123 | diverged |  |
| origin/feat/memory-p4-oplog | 1 | 117 | diverged |  |
| origin/memory/block-migrate | 2 | 115 | diverged |  |
| origin/feat/infra-policy-probe | 2 | 112 | diverged |  |
| origin/feat/evidence-workshop-index | 1 | 109 | diverged |  |
| origin/fix/archivarius-hygiene-params | 2 | 106 | diverged |  |
| origin/fix/keep-branch-cli | 5 | 102 | diverged |  |
| origin/claude/night-triage-1785281401424 | 1 | 102 | diverged |  |
| origin/fix/registry-broken-prompt-links | 2 | 100 | diverged |  |
| origin/chore/deps-basket-card | 1 | 100 | diverged |  |
| origin/chore/dreams-office-deploy-prep | 1 | 99 | diverged |  |
| origin/fix/decompose-config-catchup | 3 | 94 | diverged |  |
| origin/chore/review-gate-declaration | 3 | 89 | diverged |  |
| origin/fix/review-gate-pr-head | 1 | 88 | diverged |  |
| origin/chore/archive-procedures-corpus-r2 | 1 | 87 | diverged |  |
| origin/chore/truth-archive-pointer-r2 | 1 | 87 | diverged |  |
| origin/fix/consilium-canon-sync-r2 | 1 | 86 | diverged |  |
| origin/audit-pr-1477 | 1 | 53 | diverged |  |
| origin/claude/night-triage-1785367801147 | 1 | 53 | diverged |  |
| origin/feat/tooling-sanitary-pack-3007 | 3 | 50 | diverged |  |
| origin/meeting/sprint-honest-m2 | 4 | 47 | diverged |  |
| origin/tooling/consilium-input-manifest-2026-07-30 | 1 | 48 | diverged |  |
| origin/cowork/cowork-honest-sprint/cut-contract | 7 | 36 | diverged | yes |
| origin/cowork/cowork-honest-sprint/execution-gate | 7 | 36 | diverged | yes |
| origin/cowork/cowork-honest-sprint/experience-loop | 7 | 36 | diverged | yes |
| origin/meeting/workshop-wires-m0-2026-07-30 | 1 | 32 | diverged |  |
| origin/audit-pr-1508 | 1 | 29 | diverged |  |
| origin/codex/repair-handoff-card-truth | 1 | 29 | diverged |  |
| origin/pr-1508 | 1 | 29 | diverged |  |
| origin/audit-pr-1511 | 1 | 26 | diverged |  |
| origin/codex/handoff-item5-truth | 1 | 26 | diverged |  |
| origin/pr-1511 | 1 | 26 | diverged |  |
| origin/audit-pr-1513 | 1 | 25 | diverged |  |
| origin/pr-1513 | 1 | 25 | diverged |  |
| origin/audit-pr-1521 | 1 | 19 | diverged |  |
| origin/docs/insight-recollection-pattern | 1 | 13 | diverged |  |
| origin/audit-pr-1534 | 1 | 7 | diverged |  |
| origin/claude/night-triage-1785454201834 | 1 | 7 | diverged |  |
| origin/admin-mcp/redeploy-probe-16a4424 | 0 | 298 | behind-only |  |
| origin/fix/protocol-body-tail-echo-2026-07-31 | 7 | 0 | ahead-only | yes |
| origin/main | 0 | 0 | sync |  |

## Buckets summary

| Bucket | Local | Remote |
| --- | --- | --- |
| sync | 1 | 1 |
| ahead-only | 1 | 1 |
| behind-only | 29 | 1 |
| diverged | 123 | 133 |

