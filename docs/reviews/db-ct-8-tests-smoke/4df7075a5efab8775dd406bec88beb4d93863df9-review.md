```text
Tier: T0
Task: db-ct-8-tests-smoke
Commit: 4df7075a5efab8775dd406bec88beb4d93863df9

[Teamlead]: Scope is documentation + smoke runbook (4 files, no code changes). Diff is clean, no secrets/artifacts. All checks pass on exact SHA. PR#232 open, merge pending. T0 review: correctness of canon references, smoke procedure clarity, and consistency with upstream CT1–CT7 narrative. No architecture risk; no cross-package boundary; no auth/deploy concern. LGTM on documentation quality and smoke checklist completeness.

[Структурщик]: —

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

P0/P1: —

P2: 
- `DEVICE_BOARD_SERVER_FIRST.md` line 164: smoke runbook link (new file) — ensure canonical path `actions/device-board/smoke/DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md` is committed and indexed in docs nav if applicable.
- `DESIGN.md` "Device capture state" section references `resolveServerFirstBadgeDescriptors()` and `resolveDeviceCaptureFlags()` — verify these helpers exist in `@membrana/device-board` or note as C9 deliverable.

Checks: 
- git diff --check — pass (4df7075, 2026-07-02T19:04:17Z)
- Package Membrana Studio (Windows nsis) — pass (4df7075, 2026-07-02T19:00:17Z)
- Turbo unit tests — pass (4df7075, 2026-07-02T18:56:42Z)
- Lint, typecheck, test, build — pass (4df7075, 2026-07-02T18:59:39Z)
- Decide if studio affected — pass (4df7075, 2026-07-02T18:54:14Z)
- verify — pass (4df7075, 2026-07-02T18:58:41Z)
- optional-review — skipped (non-blocking)

Closure readiness: waiting_merge

Verdict: LGTM
```
