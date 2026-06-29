---
name: membrana-device-board-edit
description: "Guides edits to @membrana/device-board graph editor: undo depth=1, ScenarioRevertPolicy, branch navigation, function UX. Use when changing device-board graph, canvas, undo, breadcrumbs, or packages/device-board. Do NOT use for full Mintlify node reference (db-doc-v04-mvp) or runtime WebSocket MP7 without reading SCENARIO_RUNTIME."
---
# Membrana device-board edit

## Context checklist

| Doc | Path |
|-----|------|
| Canon | `packages/device-board/DEVICE_BOARD_CONCEPT.md` (§21 Edit & navigation) |
| Package | `packages/device-board/README.md` |
| Agent catalog | `docs/catalog/client/prompts/modules/device-board.md` (**stable**) |
| Runtime | `docs/SCENARIO_RUNTIME.md` §11 Editor vs runtime |
| Mintlify | `apps/docs/device-board/editor/` |

Before client module edits: `docs/catalog/client/registry.json` → `device-board` `promptPath`.

## Edit model v2 (code)

| Topic | Location |
|-------|----------|
| Branch navigation | `packages/device-board/src/graph/branch-navigation.ts` |
| RevertPolicy | `revert-if-dirty` \| `keep-dirty` |
| Undo controller | `packages/device-board/src/graph/edit-undo-controller.ts` |
| Integration | `device-board-graph-context.tsx`, `device-board-nav.integration.test.tsx` |

## UX rules (docs must match)

- **Undo:** depth=1; Ctrl+Z; **no** free-drag undo in v1.
- **F7:** `savedDocumentRef` + revert on branch switch when dirty.
- **Functions:** direct edit on function branch; modal on scenario branches.
- **Runtime highlight:** exec path overlay on Run — presentation only.

## Verify

```bash
yarn workspace @membrana/device-board test
yarn catalog:verify-client
```

## Out of scope

- Changing `@membrana/core` scenario contracts without **vesnin** branch.
- Duplicating full node reference pages.
