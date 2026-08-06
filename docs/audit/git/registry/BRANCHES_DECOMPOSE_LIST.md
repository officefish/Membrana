# repo:branches:decompose — 7 hygiene categories

base SHA: `1b39a0f7848fd4091aa321e3193e7c0d79de7159` · generated: 2026-08-06T06:08:02.338Z

base: origin/main · fetch: yes · current: angelina/work/2026-08-06 · gh open-PR: yes

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
Remote twin stays outside category rows when local exists; every pair is listed below.
Not for auto-delete. Personas never auto-delete. Use `yarn repo:clean` only after human ok.

## Twin diagnostics

| Branch | Local tip | Remote tip | Status |
| --- | --- | --- | --- |
| angelina/chore/handoff-20260804 | 3e25f7509e34 | 3e25f7509e34 | exact |
| angelina/chore/ritual-day-20260802 | 32579312f65e | 32579312f65e | exact |
| angelina/chore/ritual-evening-20260803 | 2f52ffaa049d | 2f52ffaa049d | exact |
| angelina/fix/handoff-xai-correction | 10e82ae780f7 | 6bf3138432da | moved |
| chore/graphify-public-graph | 25cd7358ee61 | 425317fcf25f | moved |
| chore/redact-stale-loop | fbef96f657dc | fbef96f657dc | exact |
| claude/oneshot/oversized-hostlocal-20260803 | 87e611a7c810 | 87e611a7c810 | exact |
| claude/sprint/detectors-window-20260802 | ffee4f910371 | ffee4f910371 | exact |
| codex/archive-product-mintlify | 4fc80e16e672 | 4fc80e16e672 | exact |
| codex/branch-hygiene-archive-2026-07-31 | c19b376cda7f | ac4bc9053e86 | moved |
| codex/branch-hygiene-closeout-2026-07-31 | e65025638e3d | 3d1fc8283bb1 | moved |
| codex/branch-hygiene-execution-2026-07-31 | 0d8474006724 | 0d8474006724 | exact |
| codex/branch-hygiene-issue-closure-2026-07-31 | c7d05f6f729f | c7d05f6f729f | exact |
| codex/branch-hygiene-salvage-2026-07-31 | 6aa999fd0445 | 6aa999fd0445 | exact |
| codex/branch-salvage-controlled-tooling | 3ab28362bc58 | 3ab28362bc58 | exact |
| codex/branch-salvage-controlled-tooling-closeout | 9eb18837ded3 | 9eb18837ded3 | exact |
| codex/execution-procedure-interface | 80122cffe069 | 80122cffe069 | exact |
| codex/hackathon-procedure | aad4da7f7939 | aad4da7f7939 | exact |
| codex/handoff-item5-truth | cdf8d93b785e | cdf8d93b785e | exact |
| codex/harness-product-deploy | 88f288e76ff7 | 88f288e76ff7 | exact |
| codex/harness-product-sprint-closure | a5ee2e289d41 | a5ee2e289d41 | exact |
| codex/mintlify-workshops-procedures-hackathon | 2efd89b8ea9a | 2efd89b8ea9a | exact |
| codex/product-docs-container | ad399b7b180e | ff44afd775b9 | moved |
| codex/repair-handoff-card-truth | 463d18f85e72 | 463d18f85e72 | exact |
| codex/ship-chain-frictions-salvage-2026-07-31 | c404f12656a1 | c404f12656a1 | exact |
| cowork/cowork-honest-sprint/cut-contract | ca97af4bdaee | ca97af4bdaee | exact |
| cowork/cowork-honest-sprint/execution-gate | d2650fd5a9d9 | d2650fd5a9d9 | exact |
| cowork/cowork-honest-sprint/experience-loop | 2752698c05db | 2752698c05db | exact |
| cowork/cowork-strategic-docs-container/canon-data | 5f824fd60884 | 5f824fd60884 | exact |
| cowork/cowork-strategic-docs-container/engine-renderer | c0ffe7f7dfe4 | c0ffe7f7dfe4 | exact |
| cowork/cowork-strategic-docs-container/generators-validation | d27e4d086e76 | d27e4d086e76 | exact |
| docs/insight-1687-registry-tail | 91845e3e7e88 | 91845e3e7e88 | exact |
| docs/night-cap-2026-07-21 | 1c5d299c278c | 9745737b2493 | moved |
| docs/precedent-cold-session-2026-07-31 | ade02bf42635 | ade02bf42635 | exact |
| docs/precedent-orphan-diagnosis-2026-07-31 | 6fa08f1b3737 | b9cf4075e69d | moved |
| fix/adr-0013-accepted | 734099049a0c | 37ed5a8f307f | moved |
| fix/keep-branch-cli | c8c8e2fe7d3e | c8c8e2fe7d3e | exact |
| main | 4ca2704825f9 | 1b39a0f7848f | moved |
| sprint/review-honesty | 4919c6c541f7 | 4919c6c541f7 | exact |
| tooling/run-journal-debts | 601a0b093258 | 601a0b093258 | exact |
| tooling/run-journal-producer | 292ec1e2d431 | 292ec1e2d431 | exact |
| tooling/run-journal-producer-2 | 20a88078f5ba | f00ddfd2f762 | moved |

## Summary

| Category | Local | Remote | Total |
| --- | --- | --- | --- |
| 1. Worktree-активные | 17 | 0 | 17 |
| 2. Персоны | 1 | 0 | 1 |
| 3. Baseline / sync-якоря | 5 | 0 | 5 |
| 4. Доставка в полёте | 2 | 2 | 4 |
| 5. Эксперимент leftover | 43 | 1 | 44 |
| 6. Застой / zombie | 29 | 15 | 44 |
| 7. Salvage | 110 | 4 | 114 |

## 1. Worktree-активные

Worktree=yes или текущая ветка сессии — не трогать.

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| chore/archive-tw-v1-v2 | b12e3e2803e6 | 2 | 458 | diverged | worktree=yes | keep — active |
| docs/night-cap-2026-07-21 | 1c5d299c278c | 3 | 458 | diverged | worktree=yes | keep — active |
| feat/closure-acceptance-gate | bd38314ca14a | 2 | 458 | diverged | worktree=yes | keep — active |
| feat/membrana-leveling-adopt | 09abcb9789b2 | 1 | 399 | diverged | worktree=yes | keep — active |
| codex/llm-procedure-panel | 8c75e0b51bb5 | 0 | 296 | behind-only | worktree=yes | keep — active |
| worktree-agent-ae43a2ec288ea290c | f147bbd2fa91 | 2 | 246 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/cut-contract | ca97af4bdaee | 7 | 181 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/execution-gate | d2650fd5a9d9 | 7 | 181 | diverged | worktree=yes | keep — active |
| cowork/cowork-honest-sprint/experience-loop | 2752698c05db | 7 | 181 | diverged | worktree=yes | keep — active |
| codex/procedure-run-journal | 350e2d9da99b | 0 | 119 | behind-only | worktree=yes | keep — active |
| codex/mintlify-workshops-procedures-hackathon | 2efd89b8ea9a | 8 | 101 | diverged | worktree=yes | keep — active |
| parked/archivarius-2026-07-28 | f8acff608dfb | 0 | 81 | behind-only | worktree=yes | keep — active |
| codex/harness-product-sprint-closure | a5ee2e289d41 | 1 | 64 | diverged | worktree=yes | keep — active |
| codex/meeting-static-container-20260803 | 2480825caf4c | 59 | 57 | diverged | worktree=yes | keep — active |
| angelina/chore/handoff-20260804 | 3e25f7509e34 | 1 | 31 | diverged | worktree=yes | keep — active |
| sprint/review-honesty | 4919c6c541f7 | 3 | 1 | diverged | worktree=yes | keep — active |
| angelina/work/2026-08-06 | 1b39a0f7848f | 0 | 0 | sync | worktree + current | keep — active |

## 2. Персоны

ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| dynin | 818ee6f09ab4 | 0 | 1091 | behind-only | persona branch (canon) | never auto-delete |

## 3. Baseline / sync-якоря

`main` или `base/*` — якоря синхронизации.

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| base/codex | a69d4c4aad65 | 0 | 648 | behind-only | base/* sync anchor | keep — anchor |
| base/cursor | a69d4c4aad65 | 0 | 648 | behind-only | base/* sync anchor | keep — anchor |
| base/product | a69d4c4aad65 | 0 | 648 | behind-only | base/* sync anchor | keep — anchor |
| base/tooling | a69d4c4aad65 | 0 | 648 | behind-only | base/* sync anchor | keep — anchor |
| main | 4ca2704825f9 | 0 | 1 | behind-only | main baseline | keep — anchor |

## 4. Доставка в полёте

Head открытого GitHub PR (нужен `gh`; иначе категория пуста).

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| origin/claude/night-triage-1785972609913 | a42f3da684ec | 1 | 1 | diverged | open PR #1734 | wait PR |
| angelina/fix/handoff-xai-correction | 10e82ae780f7 | 6 | 5 | diverged | open PR #1728 | wait PR |
| origin/claude/night-triage-1785886201230 | 840c99fc43a2 | 1 | 11 | diverged | open PR #1720 | wait PR |
| codex/execution-procedure-interface | 80122cffe069 | 5 | 101 | diverged | open PR #1613 | wait PR |

## 5. Эксперимент leftover

Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| origin/night/agent-context-optimization-v1-2026-06-27 | edb0987041ea | 4 | 1454 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fv1-s2-content | 99b8e8d3ea39 | 8 | 1327 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-migration-sprint | 4e6aefa86a8c | 9 | 1327 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/alpha | c8f13276f5a3 | 5 | 1053 | diverged | experiment/ritual leftover prefix | review leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 3df6beef5549 | 5 | 1053 | diverged | experiment/ritual leftover prefix | review leftover |
| night/graphify-public-graph-2026-07-15 | 0394ce70800c | 1 | 876 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/canon-data | 5f824fd60884 | 2 | 441 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/engine-renderer | c0ffe7f7dfe4 | 2 | 441 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-strategic-docs-container/generators-validation | d27e4d086e76 | 3 | 441 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/worktree-demolition-frames | 7e828133cb3e | 2 | 191 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/evening-ritual-door | bf66c4fe31ca | 4 | 186 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/handoff-liveness-pr-carriers | 68ce8a52292d | 1 | 179 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-open | 3aca579bdf30 | 4 | 179 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-phase1 | de7337d68a07 | 6 | 175 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/repair-handoff-card-truth | 463d18f85e72 | 1 | 174 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/handoff-item5-truth | cdf8d93b785e | 1 | 171 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fix-insight-overview-empty | 86968c5e95a4 | 1 | 170 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-phase2-close | beab3710e041 | 9 | 170 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/cowork-honest-sprint/integration | 13de587be3a3 | 29 | 168 | diverged | experiment/ritual leftover prefix | review leftover |
| cowork/honest-sprint-close | 0501c461629c | 1 | 167 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/meeting-task-archive-cold-store | fc331c8f92a3 | 2 | 164 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/task-archive-cold-store-implementation | a4216026a0ab | 2 | 161 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/office-task-archive-deploy-wiring | b3bee6929fdf | 1 | 158 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/recreate-pr-1508 | f24c8a6d0260 | 1 | 150 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/fix-task-archive-provenance | 62a0d1f475e2 | 1 | 147 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-salvage-2026-07-31 | 6aa999fd0445 | 3 | 144 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-execution-2026-07-31 | 0d8474006724 | 1 | 141 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/ship-chain-frictions-salvage-2026-07-31 | c404f12656a1 | 1 | 140 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-closeout-2026-07-31 | e65025638e3d | 2 | 137 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-archive-2026-07-31 | c19b376cda7f | 2 | 134 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-hygiene-issue-closure-2026-07-31 | c7d05f6f729f | 1 | 133 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-salvage-controlled-tooling | 3ab28362bc58 | 2 | 131 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-salvage-controlled-tooling-closeout | 9eb18837ded3 | 1 | 129 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/branch-salvage-atlas-examples | 350e2d9da99b | 0 | 119 | behind-only | experiment/ritual leftover prefix | review leftover |
| codex/development-matrix-delivery | f5e55efd46a9 | 1 | 109 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/procedure-runs-delivery | a0cea0d99086 | 7 | 104 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/procedure-runs-delivery-amended-save | 0b3518d83925 | 1 | 104 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/procedure-portfolio-delivery | 23647ac62289 | 3 | 103 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/hackathon-procedure | aad4da7f7939 | 3 | 101 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/product-docs-container | ad399b7b180e | 7 | 72 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/archive-product-mintlify | 4fc80e16e672 | 2 | 70 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/harness-product-deploy | 88f288e76ff7 | 3 | 68 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/harness-product-deploy-closure | a60c23b33e02 | 2 | 66 | diverged | experiment/ritual leftover prefix | review leftover |
| codex/evening-swallow-memory-20260802 | 362d33c44460 | 1 | 65 | diverged | experiment/ritual leftover prefix | review leftover |

## 6. Застой / zombie

ahead==0 vs origin/main, либо remote night-triage/claude без open PR.

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| chore/close-dsp-issues | 73f90d89a21e | 0 | 557 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784676609787 | f93266a12d76 | 1 | 550 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1784763001155 | 1bb26c05480d | 1 | 502 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1784849401366 | 1687fa2c5da0 | 1 | 458 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| work/2026-07-24-b | 0e2eed594fbb | 0 | 453 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/admin-mcp/redeploy-probe-16a4424 | 16a44243e84d | 0 | 443 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1784935801710 | a2623e19fad4 | 1 | 422 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| ritual/day-2026-07-25 | 6aec3c1b45f1 | 0 | 418 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| sync/origin-main | b05d54685cb7 | 0 | 417 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/archive-sar-w1-canon-dns | 4cd760fd542b | 0 | 408 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/angelina-group-hygiene-reverse | 1571464ee71c | 0 | 384 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/group-hygiene-reverse | 1571464ee71c | 0 | 384 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/bridge-findings-2026-07-25 | b93c8ca5778b | 0 | 378 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785022201300 | 70472e6ba7c1 | 1 | 376 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| chore/rails-idle | f63a18c0b503 | 0 | 369 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| feat/strategic-docs-workshop-v2 | 81409006424e | 0 | 364 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/main-protection-followup | 7fefcc03b64b | 0 | 328 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| probe-main | 7fefcc03b64b | 0 | 328 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785108601542 | 063486ba19b1 | 1 | 322 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1785195001465 | 6693128ec00b | 1 | 282 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| deploy/office-2026-07-28 | be52d3ba1419 | 0 | 248 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785281401424 | 83ff98520c60 | 1 | 247 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| chore/tasks-decompose-scan | 8cb203c4beab | 0 | 239 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/idle-2907-b | b38f600b74f0 | 0 | 223 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785367801147 | 1403e079b1e8 | 1 | 198 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| docs/handoff-3007-format | b96349e2c5e6 | 0 | 196 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tooling/idle-2026-07-30 | 6acde0b43f4e | 0 | 194 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| tooling/idle-2026-07-30-b | 1a1d1d52d768 | 0 | 187 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| meeting/workshop-wires-2026-07-30 | e53dedf27b32 | 0 | 178 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| chore/weave-idle | 3fb659873365 | 0 | 152 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785454201834 | c25b7a4ca9e4 | 1 | 152 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| work/after-floor-2026-07-31 | 9e89d912d7b5 | 0 | 132 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785540601474 | 53c9f66253d8 | 1 | 120 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| angelina/work/2026-08-01 | 69ca25698ffe | 0 | 117 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| angelina/work/2026-08-01-e | 1e62528907eb | 0 | 96 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| angelina/work/2026-08-01-i | 0c55001dd66f | 0 | 85 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| angelina/chore/ritual-evening-20260801 | f8acff608dfb | 0 | 81 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| angelina/work/2026-08-01-k | f8acff608dfb | 0 | 81 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785627009920 | 957943568bae | 1 | 81 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| tooling/lift-report-check | a4766257d2c0 | 0 | 74 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| audit/handoff-verify | 618ca3d51c10 | 0 | 73 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| audit/final | 103f3b97ee41 | 0 | 67 | behind-only | ahead==0 behind-only | repo:clean? after human ok |
| origin/claude/night-triage-1785713410091 | 52b712d09083 | 1 | 63 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |
| origin/claude/night-triage-1785799801513 | 6390747f77dd | 1 | 35 | diverged | remote night-triage/claude without open PR | repo:clean? after human ok |

## 7. Salvage

Остаток с ahead>0 и без open PR — спасти коммиты до чистки.

| Branch | Tip | Ahead | Behind | Bucket | Why/Note | Suggested action |
| --- | --- | --- | --- | --- | --- | --- |
| fix/adr-0013-accepted | 734099049a0c | 57 | 458 | diverged | ahead>0, no open PR | salvage commits first |
| backup/mfcc-rebased-3107 | dd9a46cb7c04 | 16 | 125 | diverged | ahead>0, no open PR | salvage commits first |
| feat/mfcc-analyzer-to-main | d26a42d8ad22 | 16 | 109 | diverged | ahead>0, no open PR | salvage commits first |
| storm/mfcc-sprint-test-3007 | 19ec8abd0934 | 15 | 162 | diverged | ahead>0, no open PR | salvage commits first |
| chore/day-2026-07-31 | 163a759ebbd2 | 14 | 141 | diverged | ahead>0, no open PR | salvage commits first |
| claude/sprint/tools-truth-20260802 | 76a0a1d20331 | 10 | 73 | diverged | ahead>0, no open PR | salvage commits first |
| chore/morning-tail-20260803 | 1d21242438aa | 9 | 54 | diverged | ahead>0, no open PR | salvage commits first |
| feat/atlas-guide-2026-07-31 | 49ecf4355b2e | 8 | 131 | diverged | ahead>0, no open PR | salvage commits first |
| fix/protocol-body-tail-echo-2026-07-31 | 529d30e9e23d | 8 | 145 | diverged | ahead>0, no open PR | salvage commits first |
| sprint/deploy-procedures | fd43b1d82a3c | 6 | 12 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/run-journal-debts | 601a0b093258 | 6 | 39 | diverged | ahead>0, no open PR | salvage commits first |
| feat/cut-act-trace | 6eee4d2e3c58 | 5 | 93 | diverged | ahead>0, no open PR | salvage commits first |
| feat/norm-in-agents-2026-07-31 | d2adec097cfc | 5 | 141 | diverged | ahead>0, no open PR | salvage commits first |
| fix/keep-branch-cli | c8c8e2fe7d3e | 5 | 247 | diverged | ahead>0, no open PR | salvage commits first |
| origin/feat/skill-truth-crystallization | e02e8bb07acd | 5 | 844 | diverged | ahead>0, no open PR | salvage commits first |
| pr1410-head | c8c8e2fe7d3e | 5 | 247 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/forecast-archive-wire | bc433a82cf18 | 5 | 111 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/run-journal-producer-2 | 20a88078f5ba | 5 | 42 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/ritual-day-20260802 | 32579312f65e | 4 | 81 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/ritual-day-20260803 | 924ad380ac9d | 4 | 63 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/ritual-evening-20260803 | 2f52ffaa049d | 4 | 40 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-f | aadfbb67033d | 4 | 99 | diverged | ahead>0, no open PR | salvage commits first |
| chore/tooling-idle | 7286c6e95095 | 4 | 117 | diverged | ahead>0, no open PR | salvage commits first |
| docs/precedent-cold-session-2026-07-31 | ade02bf42635 | 4 | 128 | diverged | ahead>0, no open PR | salvage commits first |
| feat/session-floor-2026-07-31 | 2f4a3c3e53e9 | 4 | 134 | diverged | ahead>0, no open PR | salvage commits first |
| fix/dead-issue-ref | 87c33370fc17 | 4 | 91 | diverged | ahead>0, no open PR | salvage commits first |
| ozhegov/tooling/weekly-dead-wire-audit | c30694f39b63 | 4 | 117 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/subconscious-lift-c3 | 813845b74e0a | 4 | 88 | diverged | ahead>0, no open PR | salvage commits first |
| chore/graphify-public-graph | 25cd7358ee61 | 3 | 876 | diverged | ahead>0, no open PR | salvage commits first |
| chore/shot-trail-entry | bc7276399840 | 3 | 50 | diverged | ahead>0, no open PR | salvage commits first |
| claude/sprint/detectors-window-20260802 | ffee4f910371 | 3 | 63 | diverged | ahead>0, no open PR | salvage commits first |
| docs/insight-owner-intervention | 29d1fa8a0da8 | 3 | 68 | diverged | ahead>0, no open PR | salvage commits first |
| docs/meeting-m4s | fe40eeb042b9 | 3 | 115 | diverged | ahead>0, no open PR | salvage commits first |
| feat/evening-order-and-trunk | e88bb67c0e40 | 3 | 94 | diverged | ahead>0, no open PR | salvage commits first |
| feat/experience-seam-2026-07-31 | 6261fd82c11b | 3 | 143 | diverged | ahead>0, no open PR | salvage commits first |
| feat/invariant-tooth-2026-07-31 | c2a487e17a52 | 3 | 144 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/review-live-states | 96a27fa890f5 | 3 | 79 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/fix/evening-deliver-frame | f1b77c9b2572 | 2 | 92 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/ritual/day-2026-08-01 | 64f6cde108b6 | 2 | 119 | diverged | ahead>0, no open PR | salvage commits first |
| audit/handoff-verify-2 | f0dabf3a660e | 2 | 72 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-night-hunt-32 | c9985563fa44 | 2 | 17 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/persona-roster-20260802 | 74f74a470fde | 2 | 72 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/verb-hygiene-20260803 | fe3f60f61dd6 | 2 | 62 | diverged | ahead>0, no open PR | salvage commits first |
| claude/sprint/trace-supersede-20260803 | bc11f9c66161 | 2 | 58 | diverged | ahead>0, no open PR | salvage commits first |
| claude/sprint/worktree-resolution-20260803 | f2f91c7625c7 | 2 | 56 | diverged | ahead>0, no open PR | salvage commits first |
| docs/meeting-m4-audit | e16dcdadad5d | 2 | 116 | diverged | ahead>0, no open PR | salvage commits first |
| feat/kit-frame-boundary-2026-07-31 | 8e10e32fcb4c | 2 | 139 | diverged | ahead>0, no open PR | salvage commits first |
| feat/meeting-gates-teeth | c5390dc5a0cf | 2 | 109 | diverged | ahead>0, no open PR | salvage commits first |
| fix/orphan-birth-guard | 90bb80ecd877 | 2 | 90 | diverged | ahead>0, no open PR | salvage commits first |
| origin/angelina/shot/1724-prisma-docker | b8e4bc5f1435 | 2 | 7 | diverged | ahead>0, no open PR | salvage commits first |
| ozhegov/tooling/dead-wire-catalogs | 076b78afe6b2 | 2 | 114 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/memory-report-surfacing | aebf03dc85de | 2 | 74 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/run-journal-producer | 292ec1e2d431 | 2 | 45 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/branch-salvage-cleanup | 5ec24cd4fc24 | 1 | 98 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/evening-evidence-3107 | 649604d2eb18 | 1 | 120 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/ritual-evening-20260731 | a34dac75034f | 1 | 125 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/swallow-day-20260801 | b5ba2bf35f2d | 1 | 118 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/chore/truth-crystals-0108 | cf381be9acf6 | 1 | 82 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/docs/depot-insight | df03f49e490f | 1 | 81 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/docs/handoff-20260801 | cba5238a35d4 | 1 | 124 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/docs/handoff-containers | af19aba75889 | 1 | 122 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/docs/handoff-neighbours | cdb3f8a6e8cb | 1 | 123 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/docs/handoff-start | 81e2dc8291f6 | 1 | 121 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/fix/conspectus-provenance | 69b55d33a852 | 1 | 85 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-b | 418be4f5765e | 1 | 105 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-c | cababc26c541 | 1 | 101 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-d | 6c409977610f | 1 | 100 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-g | 9370032d6f74 | 1 | 89 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-h | fa081fd17aa8 | 1 | 87 | diverged | ahead>0, no open PR | salvage commits first |
| angelina/work/2026-08-01-j | 886218d60bbf | 1 | 84 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-deploy-procedures-card | a82585924f88 | 1 | 11 | diverged | ahead>0, no open PR | salvage commits first |
| chore/archive-sequence-validator-card | dde018e2a703 | 1 | 20 | diverged | ahead>0, no open PR | salvage commits first |
| chore/cards-after-shot-refusals | 5509643fb5f7 | 1 | 24 | diverged | ahead>0, no open PR | salvage commits first |
| chore/close-cut-act-trace | 4eaf3bd35ad3 | 1 | 92 | diverged | ahead>0, no open PR | salvage commits first |
| chore/redact-stale-loop | fbef96f657dc | 1 | 37 | diverged | ahead>0, no open PR | salvage commits first |
| chore/register-llm-transport-card-2026-07-31 | 5a6cd355ff97 | 1 | 141 | diverged | ahead>0, no open PR | salvage commits first |
| chore/shot2-trail | 60b5da08ba5a | 1 | 48 | diverged | ahead>0, no open PR | salvage commits first |
| claude/insight/one-shot-portfolio-surfacing-20260803 | 5991289a6736 | 1 | 38 | diverged | ahead>0, no open PR | salvage commits first |
| claude/insight/portfolio-adopted-20260804 | 95ab3d866074 | 1 | 28 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/deadwire-weekday-20260803 | ff7ab58fc69f | 1 | 45 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/kits-recipe-20260803 | b30a63253d59 | 1 | 42 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/oversized-hostlocal-20260803 | 87e611a7c810 | 1 | 47 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/pair-props-20260803 | b48119b2eae0 | 1 | 54 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/register-category-20260803 | e7dfa8c8cd2c | 1 | 50 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/simultaneous-at-20260803 | 6d264e648923 | 1 | 44 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/stubs-verdict-20260803 | 1653c73bc16e | 1 | 39 | diverged | ahead>0, no open PR | salvage commits first |
| claude/oneshot/window-trace-20260803 | 50a0c760e4e1 | 1 | 51 | diverged | ahead>0, no open PR | salvage commits first |
| claude/sprint/honest-pair-20260803 | 590ae187b90e | 1 | 60 | diverged | ahead>0, no open PR | salvage commits first |
| docs/deploy-survey | f7b56ac89fbe | 1 | 47 | diverged | ahead>0, no open PR | salvage commits first |
| docs/insight-1687-registry-tail | 91845e3e7e88 | 1 | 34 | diverged | ahead>0, no open PR | salvage commits first |
| docs/insight-agenda-extract | 2b2fbaf495a4 | 1 | 110 | diverged | ahead>0, no open PR | salvage commits first |
| docs/meeting-m4x | ef09ee167699 | 1 | 113 | diverged | ahead>0, no open PR | salvage commits first |
| docs/meeting-m6-epic | 87ca240cfe43 | 1 | 111 | diverged | ahead>0, no open PR | salvage commits first |
| docs/precedent-orphan-diagnosis-2026-07-31 | 6fa08f1b3737 | 1 | 126 | diverged | ahead>0, no open PR | salvage commits first |
| docs/precedent-orphan-diagnosis-2026-07-31-b | 6fa08f1b3737 | 1 | 126 | diverged | ahead>0, no open PR | salvage commits first |
| fix/1659-report-from-events | 3a0bd7aabab2 | 1 | 26 | diverged | ahead>0, no open PR | salvage commits first |
| fix/review-verdict-over-truncated-diff | e6c569fcbe99 | 1 | 137 | diverged | ahead>0, no open PR | salvage commits first |
| origin/night-hunt/services-api-drift-1785754833058 | 47903ed3bde1 | 1 | 57 | diverged | ahead>0, no open PR | salvage commits first |
| origin/tooling/consilium-input-manifest-2026-07-30 | 55f952d29608 | 1 | 193 | diverged | ahead>0, no open PR | salvage commits first |
| ritual/day-2026-07-30 | 5b975f95dda2 | 1 | 198 | diverged | ahead>0, no open PR | salvage commits first |
| ritual/evening-2026-07-29 | 17cd343bfd35 | 1 | 202 | diverged | ahead>0, no open PR | salvage commits first |
| shot/oversized-queue-head | 2457b531317c | 1 | 19 | diverged | ahead>0, no open PR | salvage commits first |
| shot/pr-audit-five-stalled | 6df79fd473e4 | 1 | 16 | diverged | ahead>0, no open PR | salvage commits first |
| shot/review-gate-and-snapshots | 68362c04d02e | 1 | 5 | diverged | ahead>0, no open PR | salvage commits first |
| sprint/dictionary-to-lib | f4b4038d799d | 1 | 22 | diverged | ahead>0, no open PR | salvage commits first |
| sprint/run-journal-sequence-validator | 4fbc694d9e7e | 1 | 21 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/harmonic-full-window | f7cd9d59f21b | 1 | 97 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/mfcc-detectors-reexport | fe1dc5c04e77 | 1 | 99 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/mfcc-sample-rate | 049518d0e0bd | 1 | 101 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/prisma-generate-race | daad7cea57bb | 1 | 79 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/subconscious-lift-c3-act | 00405983c203 | 1 | 75 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/subconscious-lift-c3-blocks34 | 0f66c423d508 | 1 | 78 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/subconscious-lift-c3-port | ac46a609c47e | 1 | 76 | diverged | ahead>0, no open PR | salvage commits first |
| tooling/tasks-readme-sync-0108 | edcd456ce87e | 1 | 107 | diverged | ahead>0, no open PR | salvage commits first |

