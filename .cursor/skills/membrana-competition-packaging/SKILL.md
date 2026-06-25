---
name: membrana-competition-packaging
description: >-
  Post-competition catalog publish and operator debug for device-board UserCase forks.
  Use after Competition Sprint closure when user needs alpha/beta/gamma in picker,
  comp:publish-catalog, CATALOG_PUBLISH.json, or competition_packaging sprint.
  Do NOT use for mid-sprint team implementation (membrana-usercase-generation).
---

# Membrana competition packaging (post-sprint)

Канон: [`docs/prompts/COMPETITION_CATALOG_PUBLISH_REGULATION.md`](../../docs/prompts/COMPETITION_CATALOG_PUBLISH_REGULATION.md) · [`docs/COMPETITION_SPRINT_REGULATION.md`](../../docs/COMPETITION_SPRINT_REGULATION.md).

## When

- Competition sprint **closed** (`CLOSURE.md`, `WINNER.md`)
- User wants **all team forks** in device-board UserCase picker for browser debug
- New `competition_packaging` / catalog sprint

## Publish workflow

```bash
yarn usercase:build-competition-async-v2-all
yarn usercase:verify-competition-async-v2
yarn comp:publish-catalog --id <sprint-id>
yarn workspace @membrana/device-board test -- src/catalog/user-case-catalog.test.ts
yarn workspace @membrana/usercase-catalog-service test
```

Manifest: `docs/competition-sprint/<sprint-id>/CATALOG_PUBLISH.json`  
Generated: `packages/device-board/src/catalog/community-competition-user-case-entries.ts`

## Operator debug

1. `yarn workspace @membrana/client dev`
2. Pick **Sprint** tier UserCase (alpha / beta / gamma)
3. Apply → Run ≥60s → `yarn logs:parse`

## Design synthesis (optional)

```bash
yarn competition:synthesis-async-v2 --deepseek
```

Reads team `CONCEPT.md` + v1 synthesis → `COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md`.

## Package scope

- `@membrana/device-board` — `community-competition-user-case-entries.ts`, `bundled-user-case-entries.ts`
- `@membrana/usercase-catalog` — entitlement `community` → `canApply: true`
- `scripts/comp-publish-catalog.mjs`

## Do not

- Merge winner into bundled MVP without product LGTM
- Edit generated `community-competition-user-case-entries.ts` by hand — regenerate via `comp:publish-catalog`
- Mix publish with mid-sprint `comp:open` team branches

## Output

Picker ids published, verify green, tests updated, `CATALOG_PUBLISH_STATE.md` path.
