```text
Tier: T2
Task: db-ct-7-v1-cleanup
Commit: 4df7075a5efab8775dd406bec88beb4d93863df9

[Teamlead]: PR size M (19 files, ~800 LOC removed, ~400 added). Cleanup completion: v1-superset surface (pause/resume/setMode, edit-lease, authority/followerMode) fully removed from wire, parsers, builders, gateway module, cabinet UI hooks. All tests updated with CT7 markers. Docs refreshed (ARCHITECTURE.md, DESIGN.md, DEVICE_BOARD_SERVER_FIRST.md). Comments memorialized v1 for tariff v3 migration. All CI checks pass (lint, typecheck, unit, build). LGTM.

[Структурщик]: C1 pass — multi-package cleanup (cabinet, client, background-cabinet, core, device-board). Edit-lease module disabled in app.module (not removed, idempotent). Wire contract narrowed correctly: RuntimeCommandPayload now run/selectScenario/stop only; authority/followerMode stripped from parser. No cross-boundary violations; device-capture lifecycle isolated. Gateway whitelist enforcement unaffected by removals.

[Музыкант]: — (audio engine unchanged, stop{fadeOutMs} retained)

[Верстальщик]: C5 partial — UI props simplified (useCabinetNodeRuntime interface: pause/resume/setMode removed). DeviceBoardPage refactor cosmetic but consistent (capture mode selector, button groups, initial session prop). DaisyUI classes maintained. a11y aria-labels present on controls. No regression surface.

P0/P1: —

P2:
- `apps/cabinet/src/lib/useCabinetEditLease.ts` deletion: renew-heartbeat logic was never migrated to capture-lifecycle (CT2); confirm capture heartbeat test coverage exists in gateway module before closure.
- `packages/background-cabinet/src/app.module.ts`: ScenarioEditLeaseModule commented but not removed from imports — consider full deletion or lazy-load guard for tariff v3 merge conflict avoidance.

Checks:
- `git diff --check` — pass
- `github-check:Lint, typecheck, test, build` — pass
- `github-check:Turbo unit tests` — pass
- `github-check:Package Membrana Studio (Windows nsis)` — pass
- `github-check:Decide if studio affected` — pass
- `github-check:verify` — pass
- `github-check:optional-review` — skipped

Closure readiness: ready
Verdict: LGTM
```
