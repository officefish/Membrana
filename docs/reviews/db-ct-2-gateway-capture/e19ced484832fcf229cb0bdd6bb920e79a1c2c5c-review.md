```text
Tier: T1
Task: db-ct-2-gateway-capture
Commit: e19ced484832fcf229cb0bdd6bb920e79a1c2c5c

[Teamlead]: CT2 gateway capture lifecycle — heartbeat 2м/TTL 5м + tariff v2 whitelist (403). PR size M, 16 files. Dependency db-ct-1-core-contracts (PR#226 LGTM, not yet merged). All checks pass (lint, typecheck, test, build). No P0/P1 issues. LGTM.

[Структурщик]: C1 boundaries ✓ (single package `packages/background-cabinet`); C3 exports ✓ (DeviceCaptureService, DeviceCaptureRegistry, domain constants via node-realtime-wire); C4 deprecations ✓ (node-realtime-wire marks v1 legacy types, CT7 cleanup planned); C7 tests ✓ (device-capture.test.ts 69 lines, service.test.ts 208 lines, gateway.test.ts 100+ new lines; TTL math, whitelist validation, capture/release cycle, heartbeat sweep, membrane isolation). Schema migration clean (NodeDeviceCapture model, unique (membraneId, mediaDeviceId), expiresAt index for TTL).

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

P0/P1: —

P2:
  - `device-capture.service.ts` lines 111–116: `deleteMany` expired captures on each capture request — acceptable for low-cardinality Membrane, but future audit recommended if scale increases (consider background cleanup task in CT8 smoke phase).
  - `node-realtime.gateway.ts` lines 175–216: gateway enforcement logic solid; suggest docstring linking to canon §4.1 (tariff whitelist). Log message "device is not captured by cabinet" — consider adding deviceId for observability during incidents.
  - `device-capture.registry.ts` line 32: in-memory TTL check on read (get) — correct for eventual consistency, but document that stale entries may persist until next heartbeatSweep or explicit delete; matches canon §3 pattern.
  - `parseRuntimeCommandPayload` in `node-realtime-wire.ts` lines 264–313: nested switch/case handles v1 legacy (authority, followerMode) — readable, but consider future extraction to separate v1-compat validator if v3 adds new fields.

Checks:
  - `git diff --check` — pass (2026-07-02T11:03:58.121Z, e19ced484832fcf229cb0bdd6bb920e79a1c2c5c)
  - `github-check:verify` — pass (2026-07-02T11:02:52Z, success · run 28584777580/job 84753525959)
  - `github-check:optional-review` — skipped (2026-07-02T10:56:26Z)

Closure readiness: waiting_merge
Verdict: LGTM
```
