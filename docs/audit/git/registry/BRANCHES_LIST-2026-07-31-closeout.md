# repo:branches — inventory vs origin/main

fetch: yes · current: codex/branch-hygiene-closeout-2026-07-31 · local: 80 · remote: 31

ahead = `rev-list --count origin/main..BRANCH` · behind = `rev-list --count BRANCH..origin/main`

Do **not** use `git branch --merged` (squash lies). Persona branches are never auto-deleted — see `yarn repo:clean`.

## Local branches

| Branch | Ahead | Behind | Bucket | Current | Worktree |
| --- | --- | --- | --- | --- | --- |
| codex/task-archive-migration-sprint | 9 | 1190 | diverged |  |  |
| codex/fv1-s2-content | 8 | 1190 | diverged |  |  |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 916 | diverged |  |  |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 916 | diverged |  |  |
| chore/graphify-public-graph | 3 | 739 | diverged |  |  |
| night/graphify-public-graph-2026-07-15 | 1 | 739 | diverged |  |  |
| fix/adr-0013-accepted | 57 | 321 | diverged |  |  |
| docs/night-cap-2026-07-21 | 3 | 321 | diverged |  | yes |
| chore/archive-tw-v1-v2 | 2 | 321 | diverged |  | yes |
| feat/closure-acceptance-gate | 2 | 321 | diverged |  | yes |
| cowork/cowork-strategic-docs-container/generators-validation | 3 | 304 | diverged |  |  |
| cowork/cowork-strategic-docs-container/canon-data | 2 | 304 | diverged |  |  |
| cowork/cowork-strategic-docs-container/engine-renderer | 2 | 304 | diverged |  |  |
| feat/membrana-leveling-adopt | 1 | 262 | diverged |  | yes |
| fix/keep-branch-cli | 5 | 110 | diverged |  |  |
| pr1410-head | 5 | 110 | diverged |  |  |
| worktree-agent-ae43a2ec288ea290c | 2 | 109 | diverged |  | yes |
| ritual/evening-2026-07-29 | 1 | 65 | diverged |  |  |
| ritual/day-2026-07-30 | 1 | 61 | diverged |  |  |
| cowork/cowork-honest-sprint/integration | 29 | 31 | diverged |  |  |
| codex/worktree-demolition-frames | 2 | 54 | diverged |  |  |
| codex/evening-ritual-door | 4 | 49 | diverged |  |  |
| cowork/cowork-honest-sprint/cut-contract | 7 | 44 | diverged |  | yes |
| cowork/cowork-honest-sprint/execution-gate | 7 | 44 | diverged |  | yes |
| cowork/cowork-honest-sprint/experience-loop | 7 | 44 | diverged |  | yes |
| cowork/honest-sprint-open | 4 | 42 | diverged |  |  |
| cowork/honest-sprint-phase1 | 6 | 38 | diverged |  |  |
| codex/handoff-liveness-pr-carriers | 1 | 42 | diverged |  |  |
| cowork/honest-sprint-phase2-close | 9 | 33 | diverged |  |  |
| storm/mfcc-sprint-test-3007 | 15 | 25 | diverged |  | yes |
| codex/repair-handoff-card-truth | 1 | 37 | diverged |  |  |
| codex/handoff-item5-truth | 1 | 34 | diverged |  |  |
| codex/fix-insight-overview-empty | 1 | 33 | diverged |  |  |
| cowork/honest-sprint-close | 1 | 30 | diverged |  |  |
| codex/meeting-task-archive-cold-store | 2 | 27 | diverged |  |  |
| codex/task-archive-cold-store-implementation | 2 | 24 | diverged |  |  |
| codex/office-task-archive-deploy-wiring | 1 | 21 | diverged |  |  |
| chore/day-2026-07-31 | 14 | 4 | diverged |  |  |
| fix/protocol-body-tail-echo-2026-07-31 | 8 | 8 | diverged |  |  |
| codex/recreate-pr-1508 | 1 | 13 | diverged |  |  |
| codex/fix-task-archive-provenance | 1 | 10 | diverged |  |  |
| codex/branch-hygiene-salvage-2026-07-31 | 3 | 7 | diverged |  |  |
| feat/invariant-tooth-2026-07-31 | 3 | 7 | diverged |  |  |
| feat/experience-seam-2026-07-31 | 3 | 6 | diverged |  |  |
| feat/norm-in-agents-2026-07-31 | 5 | 4 | diverged |  |  |
| chore/register-llm-transport-card-2026-07-31 | 1 | 4 | diverged |  |  |
| codex/branch-hygiene-execution-2026-07-31 | 1 | 4 | diverged |  |  |
| codex/ship-chain-frictions-salvage-2026-07-31 | 1 | 3 | diverged |  |  |
| feat/kit-frame-boundary-2026-07-31 | 1 | 2 | diverged |  | yes |
| dynin | 0 | 954 | behind-only |  |  |
| base/codex | 0 | 511 | behind-only |  |  |
| base/cursor | 0 | 511 | behind-only |  |  |
| base/product | 0 | 511 | behind-only |  |  |
| base/tooling | 0 | 511 | behind-only |  |  |
| chore/close-dsp-issues | 0 | 420 | behind-only |  |  |
| work/2026-07-24-b | 0 | 316 | behind-only |  |  |
| ritual/day-2026-07-25 | 0 | 281 | behind-only |  |  |
| sync/origin-main | 0 | 280 | behind-only |  |  |
| chore/archive-sar-w1-canon-dns | 0 | 271 | behind-only |  |  |
| chore/angelina-group-hygiene-reverse | 0 | 247 | behind-only |  |  |
| chore/group-hygiene-reverse | 0 | 247 | behind-only |  |  |
| chore/bridge-findings-2026-07-25 | 0 | 241 | behind-only |  |  |
| chore/rails-idle | 0 | 232 | behind-only |  | yes |
| feat/strategic-docs-workshop-v2 | 0 | 227 | behind-only |  |  |
| chore/main-protection-followup | 0 | 191 | behind-only |  |  |
| probe-main | 0 | 191 | behind-only |  |  |
| chore/tooling-idle | 0 | 174 | behind-only |  |  |
| parked/archivarius-2026-07-28 | 0 | 166 | behind-only |  | yes |
| codex/llm-procedure-panel | 0 | 159 | behind-only |  | yes |
| deploy/office-2026-07-28 | 0 | 111 | behind-only |  |  |
| chore/tasks-decompose-scan | 0 | 102 | behind-only |  |  |
| chore/idle-2907-b | 0 | 86 | behind-only |  |  |
| docs/handoff-3007-format | 0 | 59 | behind-only |  |  |
| tooling/idle-2026-07-30 | 0 | 57 | behind-only |  |  |
| tooling/idle-2026-07-30-b | 0 | 50 | behind-only |  |  |
| meeting/workshop-wires-2026-07-30 | 0 | 41 | behind-only |  |  |
| chore/weave-idle | 0 | 15 | behind-only |  |  |
| codex/branch-hygiene-closeout-2026-07-31 | 0 | 0 | sync | yes | yes |
| fix/review-verdict-over-truncated-diff | 0 | 0 | sync |  | yes |
| main | 0 | 0 | sync |  |  |

## Remote origin/*

| Branch | Ahead | Behind | Bucket | Worktree |
| --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 1317 | diverged |  |
| origin/chore/graphify-public-graph | 1 | 739 | diverged |  |
| origin/feat/skill-truth-crystallization | 5 | 707 | diverged |  |
| origin/fix/adr-0013-accepted | 53 | 507 | diverged |  |
| origin/docs/night-cap-2026-07-21 | 1 | 417 | diverged | yes |
| origin/claude/night-triage-1784676609787 | 1 | 413 | diverged |  |
| origin/claude/night-triage-1784763001155 | 1 | 365 | diverged |  |
| origin/claude/night-triage-1784849401366 | 1 | 321 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/generators-validation | 3 | 304 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/canon-data | 2 | 304 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/engine-renderer | 2 | 304 | diverged |  |
| origin/claude/night-triage-1784935801710 | 1 | 285 | diverged |  |
| origin/claude/night-triage-1785022201300 | 1 | 239 | diverged |  |
| origin/claude/night-triage-1785108601542 | 1 | 185 | diverged |  |
| origin/claude/night-triage-1785195001465 | 1 | 145 | diverged |  |
| origin/fix/keep-branch-cli | 5 | 110 | diverged |  |
| origin/claude/night-triage-1785281401424 | 1 | 110 | diverged |  |
| origin/claude/night-triage-1785367801147 | 1 | 61 | diverged |  |
| origin/tooling/consilium-input-manifest-2026-07-30 | 1 | 56 | diverged |  |
| origin/cowork/cowork-honest-sprint/cut-contract | 7 | 44 | diverged | yes |
| origin/cowork/cowork-honest-sprint/execution-gate | 7 | 44 | diverged | yes |
| origin/cowork/cowork-honest-sprint/experience-loop | 7 | 44 | diverged | yes |
| origin/codex/repair-handoff-card-truth | 1 | 37 | diverged |  |
| origin/codex/handoff-item5-truth | 1 | 34 | diverged |  |
| origin/claude/night-triage-1785454201834 | 1 | 15 | diverged |  |
| origin/codex/branch-hygiene-salvage-2026-07-31 | 3 | 7 | diverged |  |
| origin/codex/branch-hygiene-execution-2026-07-31 | 1 | 4 | diverged |  |
| origin/codex/ship-chain-frictions-salvage-2026-07-31 | 1 | 3 | diverged |  |
| origin/feat/kit-frame-boundary-2026-07-31 | 1 | 2 | diverged | yes |
| origin/admin-mcp/redeploy-probe-16a4424 | 0 | 306 | behind-only |  |
| origin/main | 0 | 0 | sync |  |

## Buckets summary

| Bucket | Local | Remote |
| --- | --- | --- |
| sync | 3 | 1 |
| ahead-only | 0 | 0 |
| behind-only | 28 | 1 |
| diverged | 49 | 29 |
