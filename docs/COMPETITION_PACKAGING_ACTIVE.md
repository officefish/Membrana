# Competition Packaging ACTIVE

| Поле | Значение |
|------|----------|
| **status** | `open` |
| **sprintId** | `comp-packaging-catalog-2026-06-25` |
| **kind** | `competition-packaging` |
| **brief** | [`COMPETITION_PACKAGING_SPRINT_BRIEF.md`](./competition-sprint/comp-packaging-catalog-2026-06-25/COMPETITION_PACKAGING_SPRINT_BRIEF.md) |
| **prompt** | [`COMPETITION_PACKAGING_CATALOG_SPRINT_PROMPT.md`](./prompts/COMPETITION_PACKAGING_CATALOG_SPRINT_PROMPT.md) |
| **parent** | `comp-mvp-async-v2-2026-06-25` (closed) |
| **openedAt** | 2026-06-25 |
| **gate** | [`GATE.md`](./competition-sprint/comp-packaging-catalog-2026-06-25/GATE.md) |

## Phase A (done)

Catalog publish: три async-v2 fork в device-board picker (`tier: community`).

**Publish:** `yarn comp:publish-catalog --id comp-mvp-async-v2-2026-06-25`

## Phase B–C (open)

- [ ] `yarn competition:synthesis-async-v2` → design synthesis doc
- [ ] Operator: Apply + Run + `yarn logs:parse` на каждый fork

## Competition sprint (closed)

| sprintId | Статус |
|----------|--------|
| `comp-mvp-packaging-2026-06-21` | closed |
| `comp-mvp-async-v2-2026-06-25` | closed · winner Beta |
