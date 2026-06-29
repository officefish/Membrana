# Issue #178 / PR #179 patch map

Baseline: `main` after PR #181 and PR #198. Source candidate: stale PR #179.

| PR #179 concern | Current main | Decision |
|---|---|---|
| wait for media configuration before upload | `uploadTrackAsync()` awaits `mediaSvc.init()`; PR #181 smoke has upload-ok=4 | equivalent; drop |
| reject empty capture blob | present in `uploadTrackAsync()` as `EMPTY_BLOB` | present; drop |
| detached async-resolved dispatch and pack wiring | PR #181 L18-L23, tests and alpha smoke | present; drop |
| ensure reserved collections on cold `importBlob` | absent | salvage with unit test |
| do not await full catalog provisioning in `ensure-reserved` | absent; controller awaits provision | salvage with controller test |
| separate DomainError `code` field in trace | message already includes code; non-blocking observability | obsolete for acceptance |
| Beta/Gamma generated packs and operator docs | historical sprint output mixed into stale branch | drop |
| capacity/deploy docs and SSH diagnostics | outside Issue #178 code closure | out of scope |
| archive `comp-packaging-catalog-2026-06-25` | already archived in current registry | drop |

## Acceptance evidence

- Issue #178 original run `043ec8d6`: upload-ok=0, async resolved=0.
- PR #181 browser run `c778c4ee`: gate-true=4, upload-ok=4, publish-done=4,
  async resolved=4, operator smoke PASS.
- This sprint retains the two server/storage invariants that existed only on PR #179,
  preventing a cold upload race and a long ensure-reserved response after a clean deploy.
