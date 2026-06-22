---
name: membrana-usercase-generation
description: >-
  Builds and verifies device-board UserCase packs via scripts/usercase.mjs and regulation
  docs. Use when user mentions usercase, programmatic collapse, usercase pack, or
  device-board preset scenarios. Do NOT use for generic device-board graph editing
  without UserCase manifest (membrana-device-board-edit).
---

# Membrana UserCase generation

## Entry

```bash
node scripts/usercase.mjs help
```

Regulation (if present): `docs/device-board-scripts/USERCASE_GENERATION_REGULATION.md`  
Prompt: `docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`

## Workflow

1. Read regulation + prompt before collapse/pack/build.
2. Run manifest verify tests: `yarn test:scripts` (includes `usercase-manifest.test.mjs`).
3. Layout canon: `node scripts/verify-usercase-layout.mjs` when changing layouts.
4. CI: `usercase-competition.yml`, weekly `scheduled-ci`.

## Package scope

Primarily `@membrana/device-board` + `scripts/usercase.mjs` + bundled catalog service.

## DoD hints

- Manifest schema valid (`db-uc-r0` patterns).
- CONCEPT §20 + docs page if user-facing catalog changes.
- No runtime TypeScript changes unless prompt requires.

## Output

Commands run, verify results, paths to generated `usercase-*` artifacts.
