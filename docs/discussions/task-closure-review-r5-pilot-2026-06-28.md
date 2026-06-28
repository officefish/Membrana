# R5 pilot: task closure Teamlead review

Date: 2026-06-28

Owner: Vesnin
Scope: one legacy M-task and the greenfield closure-review sprint itself.

## Decision

The pilot keeps the legacy `task:archive` path compatible. A repository-wide hard gate is
not enabled yet: the closure runner can now consume GitHub check-runs bound to the reviewed
commit, but epic-level closure still needs an explicit policy for child tasks. New work should
use `task:review:prepare` → `task:review:run` → `task:review:finalize` through the IDE skills.

## Case 1 — legacy Issue #185

- Task: `issue-185-services-device-board-boundary` (M, T2).
- Reviewed commit: `017f5cd5f4cccb66c2fa9892538ae8cdb886052b`.
- Evidence: commit-scoped `git diff --check` and successful GitHub check
  `Lint, typecheck, test, build`.
- Verdict: LGTM; no P0/P1. P2 records catalog option and hook-signature compatibility.
- Completion: explicitly accepted branch-only on `techies68`; task archived and GitHub
  Issue #185 closed with a report.
- Artifacts: `docs/reviews/issue-185-services-device-board-boundary/` and
  `docs/tasks/archive/issue-185-services-device-board-boundary.md`.

This case proved that an older active task can be closed without pretending that a PR was
merged, while preserving an immutable exact-SHA verdict.

## Case 2 — closure-review sprint

- Task: `task-closure-teamlead-review-v1` (L, expected T2).
- Diff scope starts after `946d2aa` and includes R0–R5.
- The first R0–R4 publication (`75f0a3c`) exposed stale `test:scripts` entries for two
  missing test files. The follow-up `c44b82b` removed those dead paths; its superseded CI
  run was cancelled, so it is not counted as passing evidence.
- Final exact SHA, checks, verdict, findings and completion evidence are recorded below by
  the second pilot run.

### Final result

Pending final R5 commit and GitHub checks.

## Migration notes

1. GitHub check-runs are normalized to `pass`, `fail`, or `skipped` and retain the check URL,
   timestamp and exact commit SHA.
2. Pending, cancelled and failed GitHub checks never become passing evidence.
3. Local custom checks are accepted only for a clean worktree whose HEAD equals the reviewed
   SHA; commit-diff checks remain reproducible with unrelated local work present.
4. A new commit invalidates the old verdict and requires a new manifest/review cycle.
5. Hard-gating legacy `task:archive` is deferred until child-task coverage for epic closure
   is specified and at least one merged-PR pilot is completed.
