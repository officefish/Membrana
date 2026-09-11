# Vesnin Review: v1/v4

Subject: `contract-version-carriers`, `single-truth-switch`.

Verdict: LGTM.

Reviewed:

- `packages/background-cabinet/prisma/schema.prisma`
- `packages/background-media/prisma/schema.prisma`
- `packages/background-cabinet/src/modules/pair/membrane-context-fanout.service.ts`
- `packages/background-media/src/modules/devices/devices.service.ts`
- `packages/background-cabinet/src/domain/tariff-grid-source.ts`
- `packages/background-cabinet/src/domain/tariff-projection.ts`
- `scripts/lib/tariff-cutover.mjs`
- `scripts/tariff-cutover-check.mjs`

Findings: none.

Checks seen: focused vitest 81/81; focused node tests 40/40; `tariff:cutover` shows 9 carriers and 4 teeth green; `rg TARIFF_GRID_MODE packages scripts` is empty. Package typecheck remains a workspace-dependency gap: the worktree has no own `node_modules/@membrana`, and root binaries resolve sibling stale dist exports outside #2333.
