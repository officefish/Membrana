```text
Tier: T2
Task: db-ct-1-core-contracts
Commit: c402f978b1f5c4f68d446b9ab1cb1e447dafbd49

[Teamlead]: CT1 wire contracts — capture/heartbeat/release events + runtime.stop fadeOutMs + tariff v2 whitelist. PR size M. All checks pass (lint, typecheck, test, build). No P0/P1. LGTM.

[Структурщик]: C1 boundaries ✓ (single package `packages/core`); C3 exports ✓ (capture-events.ts, validate-payloads.ts, index.ts); C4 deprecations ✓ (board-events, events.ts marked v1→v3); C7 tests ✓ (capture-payloads.test.ts 147 lines, round-trip envelope, matrix validation).

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

P0/P1: —

P2:
  - `board-events.ts` lines 4–28: deprecation comments readable but consider moving full migration guide to ARCHITECTURE.md under tariff roadmap section.
  - `capture-events.ts` lines 72–82: FIELD_ALLOWED_ACTIONS matrix correct; suggest docstring linking to canvas diagram when CT5 (UI) ships.
  - `validate-payloads.ts` lines 31–43: helper predicates (isCaptureMode, isCaptureReleaseReason) solid; isIsoDateString uses Date.parse — acceptable for contracts, but future audit recommended if stricter RFC 3339 needed.

Checks:
  - `git diff --check` — pass (2026-07-02T10:17:50.645Z, c402f978b1f5c4f68d446b9ab1cb1e447dafbd49)
  - `github-check:Lint, typecheck, test, build` — pass (2026-07-02T10:15:19Z, success)
  - `github-check:Turbo unit tests` — pass (2026-07-02T10:12:19Z, success)
  - `github-check:optional-review` — skipped (2026-07-02T10:08:33Z)

Closure readiness: waiting_merge
Verdict: LGTM
```
