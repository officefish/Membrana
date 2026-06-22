# Device Board — Docs Canvas index

> Phase 3 deliverable for epic `db-doc-v04-mvp`. Canvases live in the Cursor IDE workspace (not committed to git).

## How to open

In Cursor: click the path below or use **Open beside chat** on the `.canvas.tsx` file.

| Canvas | Path | Mintlify source |
|--------|------|-----------------|
| Architecture | `~/.cursor/projects/c-Users-user190825-practice-Membrana/canvases/device-board-architecture.canvas.tsx` | `apps/docs/device-board/architecture.mdx` |
| Streaming pipeline | `.../device-board-streaming-pipeline.canvas.tsx` | `apps/docs/concepts/streaming-lifecycle.mdx` |
| Branches & variables | `.../device-board-branch-variable-map.canvas.tsx` | `apps/docs/concepts/variable-store.mdx` |

Windows absolute paths:

- `C:\Users\user190825\.cursor\projects\c-Users-user190825-practice-Membrana\canvases\device-board-architecture.canvas.tsx`
- `C:\Users\user190825\.cursor\projects\c-Users-user190825-practice-Membrana\canvases\device-board-streaming-pipeline.canvas.tsx`
- `C:\Users\user190825\.cursor\projects\c-Users-user190825-practice-Membrana\canvases\device-board-branch-variable-map.canvas.tsx`

## When to regenerate

- After changing `architecture.mdx`, `streaming-lifecycle.mdx`, or `variable-store.mdx`
- After SCENARIO_RUNTIME or DEVICE_BOARD_CONCEPT §21 edits that affect branches / variables

## Authoring

Read `~/.cursor/skills-cursor/canvas/SKILL.md` and `docs-canvas` plugin skill. One file per canvas; imports only from `cursor/canvas`.
