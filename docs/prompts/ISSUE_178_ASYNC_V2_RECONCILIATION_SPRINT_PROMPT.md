# TASK PROMPT — Issue #178 async-v2 reconciliation sprint

**Size:** L

**Date:** 2026-06-29

**Artifact:** one scoped PR or a proven no-code reconciliation, with stale PR #179 and Issue #178 closed.

## Context

Issue #178 is still open, although the main async-v2 upload happy path was merged through PR #181
and confirmed by browser smoke evidence. PR #179 is still open, conflicts with `main`, and contains
a mixed set of potentially unique server/media fixes, pack repairs, ops docs, and already-archived
sprint bookkeeping.

| Source | Role |
|---|---|
| Issue #178 | original acceptance criteria |
| PR #179 | stale candidate patches |
| PR #181 | merged happy-path evidence |
| `scenarioMicJournalBridge.ts` | client upload orchestration |
| media-library/background-media | reserved collections and server upload path |

## Full prompt

Run a fail-closed reconciliation for Issue #178. Compare every semantic patch from PR #179 against
current `main`, not just against commit SHAs. Move only missing and still-needed changes, add targeted
tests, and confirm upload/async/detached acceptance evidence. After green CI and Teamlead LGTM, close
or supersede stale PR #179 and close Issue #178 with a final report. Do not bring historical daily docs,
task registry noise, generated pack artifacts, or capacity docs unless they have a separate DoD.

## Phases

| Phase | Result |
|---|---|
| R0 Baseline | issue/PR state, acceptance evidence, and exact main SHA |
| R1 Patch map | `PR179 change -> present/equivalent/missing/obsolete` |
| R2 Salvage | only missing code/tests, or a documented no-code verdict |
| R3 Acceptance | targeted tests, CI, upload-path evidence, Teamlead review |
| R4 Reconcile | stale PR #179 and Issue #178 closed; sprint archived |

## Architectural constraints

- Client waits for media-library readiness before import, but does not create a second storage runtime.
- `MediaLibraryService` owns the reserved-collection invariant.
- background-media must not block the upload path on long catalog provisioning.
- Graph/pack repairs enter only if no equivalent exists on `main`.
- Production operations are not performed without separate deploy authorization.

## Definition of Done

- [ ] All semantic changes from PR #179 are classified with evidence.
- [ ] Unique required code fixes are moved, or proven obsolete.
- [ ] Targeted upload-path tests are green.
- [ ] Issue #178 acceptance criteria are mapped to merged/browser evidence.
- [ ] New PR, if code is needed, is green and merged.
- [ ] PR #179 is closed or converted without historical noise.
- [ ] Issue #178 receives a final report and is closed.
- [ ] Exact-SHA Teamlead closure review is LGTM; sprint is archived.

## Out of scope

- Beta/Gamma redesign beyond #178 fixes.
- General backlog work on open PRs #69/#80/#135/#188/#199.
- New media architecture or tariff/capacity roadmap.
- Production deploy and SSH diagnostics.

## Role order

1. Vesnin — identity, acceptance, final verdict.
2. Ozhegov — client/media/server boundary and patch map.
3. Dynin — test determinism and async invariants.
4. Musician — browser/mic smoke evidence if a new manual run is needed.

## Notes for the assignee

Task id: `issue-178-async-v2-reconciliation`. GitHub Issue: #178. Linear DRU-93 is already linked to
the issue; do not create a new Linear ticket.
