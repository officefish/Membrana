# Ghost task closure sprint — audit report

Date: 2026-06-29

Task: `ghost-task-closure-sprint-2026-06-29`

## Summary

All five umbrella issues were verified through GitHub and are closed. The current registry
contained exactly 38 active candidates from the supplied snapshot. Nineteen have direct
implementation/merge evidence and were archived; nineteen remain active as
`needs-decision`. No issue close command was run.

| Verdict | Count |
|---|---:|
| archived | 19 |
| closed+archived | 0 |
| kept-active | 0 |
| needs-decision | 19 |
| unverified | 0 |

## Evidence anchors

- #47 closed 2026-06-11. PR #77 implements SLD1–SLD4 and VDR1–VDR2, but the prompt's
  explicit human gate applies to the whole chain; unfinished VDR3–VDR6 confirms it remains live.
- #67 closed 2026-06-13. Platform MP0–MP6 are already archived; PR #82 contains cabinet
  sample library API/SPA/remote ops; PR #76 contains NB0–NB3 with a four-pass handoff;
  PR #88 contains CJ0–CJ5 hotfix work.
- #81 closed 2026-06-15. The referenced task prompt is missing, and required artifacts
  `.github/workflows/e2e-smoke.yml` and `docs/LGTM_SMOKE_TESTING.md` are absent.
- #93 closed 2026-06-23. MS5 closure explicitly says `partial`: MP7 timeout and missing
  manual Windows operator smoke block epic LGTM.
- #133 closed 2026-06-21. PR #132 plus archived v0.8 parity A0–A5 and smoke matrices
  complete/supersede the v0.7 R4 scope.

## Per-task verdicts

| id | issue | issue_state | work_done | verdict | action |
|---|---:|---|---|---|---|
| `single-node-detection-first` | 47 | closed | no | needs-decision | kept active; human gate |
| `real-dataset-live-calibration` | 47 | closed | no | needs-decision | kept active; human gate |
| `sample-library-drone-detection` | 47 | closed | no | needs-decision | kept active; chain incomplete |
| `sld3-dsp-detectors-free-v1` | 47 | closed | yes | needs-decision | kept active; human gate despite PR #77 |
| `sld4-stage-gate-calibration` | 47 | closed | yes | needs-decision | kept active; stage-gate requires confirmation |
| `validated-drone-recognition` | 47 | closed | no | needs-decision | kept active; VDR3–VDR6 unfinished |
| `vdr1-sample-label-patch-api` | 47 | closed | yes | needs-decision | kept active; human gate despite PR #77 |
| `vdr2-label-notes-ui` | 47 | closed | yes | needs-decision | kept active; human gate despite PR #77 |
| `vdr3-ground-truth-export` | 47 | closed | no | needs-decision | kept active |
| `vdr4-dsp-calibration-validated` | 47 | closed | no | needs-decision | kept active |
| `vdr5-template-match-detector` | 47 | closed | no | needs-decision | kept active |
| `vdr6-recognition-report-gate` | 47 | closed | no | needs-decision | kept active |
| `membrane-platform-v1` | 67 | closed | yes | archived | archived; MP0–MP6 complete |
| `cabinet-sample-library-v1` | 67 | closed | yes | archived | archived; PR #82 |
| `cabinet-sample-library-csl1-api` | 67 | closed | yes | archived | archived; PR #82 |
| `cabinet-sample-library-csl2-ui` | 67 | closed | yes | archived | archived; PR #82 |
| `cabinet-sample-library-csl3-remote-ops` | 67 | closed | yes | archived | archived; PR #82 |
| `cabinet-mp4-hardening-night-build` | 67 | closed | yes | archived | archived; PR #76 + handoff |
| `cabinet-mp4-nb0-merge-gate` | 67 | closed | yes | archived | archived; NB0 pass |
| `cabinet-mp4-nb1-sample-playback-dry` | 67 | closed | yes | archived | archived; NB1 pass |
| `cabinet-mp4-nb2-cabinet-facade` | 67 | closed | yes | archived | archived; NB2 pass |
| `cabinet-mp4-nb3-quality-contracts` | 67 | closed | yes | archived | archived; NB3 pass |
| `cabinet-journal-hotfix` | 67 | closed | yes | archived | archived; PR #88 |
| `cj-0-trends-enabled-keys` | 67 | closed | yes | archived | archived; PR #88 |
| `cj-1-media-api-safe-json` | 67 | closed | yes | archived | archived; PR #88 |
| `cj-2-journal-media-decouple` | 67 | closed | yes | archived | archived; PR #88 |
| `cj-3-brief-render-parity` | 67 | closed | yes | archived | archived; PR #88 |
| `cj-4-trends-counts-as-detection` | 67 | closed | yes | archived | archived; PR #88 |
| `cj-5-sync-push-observability` | 67 | closed | yes | archived | archived; PR #88 |
| `smoke-testing-s1-night-build` | 81 | closed | no | needs-decision | kept active; prompt/gate absent |
| `smoke-s1-nb0-gate-docs` | 81 | closed | no | needs-decision | kept active; LGTM doc absent |
| `smoke-s1-nb1-playwright-scaffold` | 81 | closed | no | needs-decision | kept active; partial scaffold only |
| `smoke-s1-nb2-smoke-tests-testids` | 81 | closed | no | needs-decision | kept active; spec unavailable |
| `smoke-s1-nb3-optional-ci-workflow` | 81 | closed | no | needs-decision | kept active; workflow absent |
| `smoke-s1-nb4-docs-handoff` | 81 | closed | no | needs-decision | kept active; handoff absent |
| `membrana-studio-desktop` | 93 | closed | no | needs-decision | kept active; MS5 closure says blocked |
| `db-recording-gate-v07` | 133 | closed | yes | archived | archived; PR #132 + parity A0–A5 |
| `db-recording-gate-r4-scenario-smoke` | 133 | closed | yes | archived | archived; superseded by verified v0.8 smoke |

## Reconciliation

- Current candidates archived by this sprint: 19.
- Current candidates deliberately left active: 19.
- #47 received no archive mutation.
- GitHub issues were already closed, so `task:close-github` was intentionally not run.
- Root cause is recorded as `insight-ghost-task-closure-invariant`.
