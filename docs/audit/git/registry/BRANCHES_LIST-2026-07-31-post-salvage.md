# repo:branches — inventory vs origin/main

fetch: yes · current: codex/branch-hygiene-salvage-2026-07-31 · local: 76 · remote: 29

ahead = `rev-list --count origin/main..BRANCH` · behind = `rev-list --count BRANCH..origin/main`

Do **not** use `git branch --merged` (squash lies). Persona branches are never auto-deleted — see `yarn repo:clean`.

## Local branches

| Branch | Ahead | Behind | Bucket | Current | Worktree |
| --- | --- | --- | --- | --- | --- |
| codex/task-archive-migration-sprint | 9 | 1186 | diverged |  |  |
| codex/fv1-s2-content | 8 | 1186 | diverged |  |  |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 912 | diverged |  |  |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 912 | diverged |  |  |
| chore/graphify-public-graph | 3 | 735 | diverged |  |  |
| night/graphify-public-graph-2026-07-15 | 1 | 735 | diverged |  |  |
| fix/adr-0013-accepted | 57 | 317 | diverged |  |  |
| docs/night-cap-2026-07-21 | 3 | 317 | diverged |  | yes |
| chore/archive-tw-v1-v2 | 2 | 317 | diverged |  | yes |
| feat/closure-acceptance-gate | 2 | 317 | diverged |  | yes |
| cowork/cowork-strategic-docs-container/generators-validation | 3 | 300 | diverged |  |  |
| cowork/cowork-strategic-docs-container/canon-data | 2 | 300 | diverged |  |  |
| cowork/cowork-strategic-docs-container/engine-renderer | 2 | 300 | diverged |  |  |
| feat/membrana-leveling-adopt | 1 | 258 | diverged |  | yes |
| fix/keep-branch-cli | 5 | 106 | diverged |  |  |
| pr1410-head | 5 | 106 | diverged |  |  |
| worktree-agent-ae43a2ec288ea290c | 2 | 105 | diverged |  | yes |
| ritual/evening-2026-07-29 | 1 | 61 | diverged |  |  |
| ritual/day-2026-07-30 | 1 | 57 | diverged |  |  |
| cowork/cowork-honest-sprint/integration | 29 | 27 | diverged |  |  |
| codex/worktree-demolition-frames | 2 | 50 | diverged |  |  |
| codex/evening-ritual-door | 4 | 45 | diverged |  |  |
| cowork/cowork-honest-sprint/cut-contract | 7 | 40 | diverged |  | yes |
| cowork/cowork-honest-sprint/execution-gate | 7 | 40 | diverged |  | yes |
| cowork/cowork-honest-sprint/experience-loop | 7 | 40 | diverged |  | yes |
| cowork/honest-sprint-open | 4 | 38 | diverged |  |  |
| cowork/honest-sprint-phase1 | 6 | 34 | diverged |  |  |
| codex/handoff-liveness-pr-carriers | 1 | 38 | diverged |  |  |
| cowork/honest-sprint-phase2-close | 9 | 29 | diverged |  |  |
| storm/mfcc-sprint-test-3007 | 15 | 21 | diverged |  | yes |
| codex/repair-handoff-card-truth | 1 | 33 | diverged |  |  |
| tooling/ship-chain-frictions-3007 | 1 | 32 | diverged |  |  |
| codex/handoff-item5-truth | 1 | 30 | diverged |  |  |
| codex/fix-insight-overview-empty | 1 | 29 | diverged |  |  |
| cowork/honest-sprint-close | 1 | 26 | diverged |  |  |
| codex/meeting-task-archive-cold-store | 2 | 23 | diverged |  |  |
| codex/task-archive-cold-store-implementation | 2 | 20 | diverged |  |  |
| codex/office-task-archive-deploy-wiring | 1 | 17 | diverged |  |  |
| fix/protocol-body-tail-echo-2026-07-31 | 8 | 4 | diverged |  |  |
| codex/recreate-pr-1508 | 1 | 9 | diverged |  |  |
| codex/fix-task-archive-provenance | 1 | 6 | diverged |  |  |
| codex/branch-hygiene-salvage-2026-07-31 | 3 | 3 | diverged | yes | yes |
| feat/invariant-tooth-2026-07-31 | 3 | 3 | diverged |  |  |
| feat/experience-seam-2026-07-31 | 3 | 2 | diverged |  |  |
| dynin | 0 | 950 | behind-only |  |  |
| base/codex | 0 | 507 | behind-only |  |  |
| base/cursor | 0 | 507 | behind-only |  |  |
| base/product | 0 | 507 | behind-only |  |  |
| base/tooling | 0 | 507 | behind-only |  |  |
| chore/close-dsp-issues | 0 | 416 | behind-only |  |  |
| work/2026-07-24-b | 0 | 312 | behind-only |  |  |
| ritual/day-2026-07-25 | 0 | 277 | behind-only |  |  |
| sync/origin-main | 0 | 276 | behind-only |  |  |
| chore/archive-sar-w1-canon-dns | 0 | 267 | behind-only |  |  |
| chore/angelina-group-hygiene-reverse | 0 | 243 | behind-only |  |  |
| chore/group-hygiene-reverse | 0 | 243 | behind-only |  |  |
| chore/bridge-findings-2026-07-25 | 0 | 237 | behind-only |  |  |
| chore/rails-idle | 0 | 228 | behind-only |  | yes |
| feat/strategic-docs-workshop-v2 | 0 | 223 | behind-only |  |  |
| chore/main-protection-followup | 0 | 187 | behind-only |  |  |
| probe-main | 0 | 187 | behind-only |  |  |
| chore/tooling-idle | 0 | 170 | behind-only |  |  |
| parked/archivarius-2026-07-28 | 0 | 162 | behind-only |  | yes |
| codex/llm-procedure-panel | 0 | 155 | behind-only |  | yes |
| deploy/office-2026-07-28 | 0 | 107 | behind-only |  |  |
| chore/tasks-decompose-scan | 0 | 98 | behind-only |  |  |
| chore/idle-2907-b | 0 | 82 | behind-only |  |  |
| docs/handoff-3007-format | 0 | 55 | behind-only |  |  |
| tooling/idle-2026-07-30 | 0 | 53 | behind-only |  |  |
| tooling/idle-2026-07-30-b | 0 | 46 | behind-only |  |  |
| meeting/workshop-wires-2026-07-30 | 0 | 37 | behind-only |  |  |
| chore/weave-idle | 0 | 11 | behind-only |  |  |
| chore/day-2026-07-31 | 14 | 0 | ahead-only |  | yes |
| feat/norm-in-agents-2026-07-31 | 4 | 0 | ahead-only |  | yes |
| chore/register-llm-transport-card-2026-07-31 | 1 | 0 | ahead-only |  |  |
| main | 0 | 0 | sync |  |  |

## Remote origin/*

| Branch | Ahead | Behind | Bucket | Worktree |
| --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 1313 | diverged |  |
| origin/chore/graphify-public-graph | 1 | 735 | diverged |  |
| origin/feat/skill-truth-crystallization | 5 | 703 | diverged |  |
| origin/fix/adr-0013-accepted | 53 | 503 | diverged |  |
| origin/docs/night-cap-2026-07-21 | 1 | 413 | diverged | yes |
| origin/claude/night-triage-1784676609787 | 1 | 409 | diverged |  |
| origin/claude/night-triage-1784763001155 | 1 | 361 | diverged |  |
| origin/claude/night-triage-1784849401366 | 1 | 317 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/generators-validation | 3 | 300 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/canon-data | 2 | 300 | diverged |  |
| origin/cowork/cowork-strategic-docs-container/engine-renderer | 2 | 300 | diverged |  |
| origin/claude/night-triage-1784935801710 | 1 | 281 | diverged |  |
| origin/claude/night-triage-1785022201300 | 1 | 235 | diverged |  |
| origin/claude/night-triage-1785108601542 | 1 | 181 | diverged |  |
| origin/claude/night-triage-1785195001465 | 1 | 141 | diverged |  |
| origin/fix/keep-branch-cli | 5 | 106 | diverged |  |
| origin/claude/night-triage-1785281401424 | 1 | 106 | diverged |  |
| origin/claude/night-triage-1785367801147 | 1 | 57 | diverged |  |
| origin/tooling/consilium-input-manifest-2026-07-30 | 1 | 52 | diverged |  |
| origin/cowork/cowork-honest-sprint/cut-contract | 7 | 40 | diverged | yes |
| origin/cowork/cowork-honest-sprint/execution-gate | 7 | 40 | diverged | yes |
| origin/cowork/cowork-honest-sprint/experience-loop | 7 | 40 | diverged | yes |
| origin/codex/repair-handoff-card-truth | 1 | 33 | diverged |  |
| origin/codex/handoff-item5-truth | 1 | 30 | diverged |  |
| origin/claude/night-triage-1785454201834 | 1 | 11 | diverged |  |
| origin/codex/branch-hygiene-salvage-2026-07-31 | 3 | 3 | diverged | yes |
| origin/admin-mcp/redeploy-probe-16a4424 | 0 | 302 | behind-only |  |
| origin/chore/day-2026-07-31 | 14 | 0 | ahead-only | yes |
| origin/main | 0 | 0 | sync |  |

## Buckets summary

| Bucket | Local | Remote |
| --- | --- | --- |
| sync | 1 | 1 |
| ahead-only | 3 | 1 |
| behind-only | 28 | 1 |
| diverged | 44 | 26 |
