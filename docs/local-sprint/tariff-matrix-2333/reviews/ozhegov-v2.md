# Ozhegov Review: v2

Subject: `grid-to-cabinet-projection`.

Verdict: LGTM.

Reviewed:

- `packages/background-cabinet/src/domain/tariff-grid-base.ts`
- `scripts/lib/tariff-project-cabinet.mjs`
- `scripts/tariff-project-cabinet.mjs`
- `packages/background-cabinet/prisma/seed.mjs`
- `packages/background-cabinet/src/modules/membrane/membrane.service.ts`
- `docs/tariffs/tariff-scalars.json`

Findings: none.

Checks seen: projection covers all live grid tariffs; tooth 2 reddens missing DB row, scalar drift and stale contract version; seed delegates tariff rows to the grid projection and does not import the old scalar carrier.
