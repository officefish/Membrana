---
description: Run the full Membrana CI pipeline (lint typecheck test build)
agent: build
---

Run the full local CI gate before merge.

1. Execute `yarn turbo run lint typecheck test build --continue` (use `--no-cache` for a clean run, `--filter=@membrana/<pkg>` to scope).
2. Service builds are a prerequisite (`typecheck`/`test` depend on `^build`) — Turbo handles the graph; run top-level, don't bypass.
3. Headless audio limits (no device) are not a CI blocker — mark as known.
4. Report per-package green/red; for red, give the package and first significant error.

Skill: `membrana-full-ci-operator`. Green full run is a gate for Teamlead LGTM.

$ARGUMENTS
