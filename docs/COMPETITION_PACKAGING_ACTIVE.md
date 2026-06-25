# Competition Packaging ACTIVE

| Поле | Значение |
|------|----------|
| **status** | `closed` |
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

## Phase B (done)

Design synthesis: [`COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md`](./competition-sprint/comp-mvp-async-v2-2026-06-25/COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md)

**Generate:** `yarn competition:synthesis-async-v2`

## Phase C (done)

Operator debug — [`OPERATOR_DEBUG_LOG.md`](./competition-sprint/comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md):

- [x] Последовательно alpha → beta → gamma
- [x] ODF cards + L17–L20 + JSON registry
- [x] Smoke runs: `9afa0b80` / `51448c9b` / `6d19b6eb`

**Archive:** `yarn task:archive comp-packaging-catalog-2026-06-25` (after pack PR merge)

## Competition sprint (closed)

| sprintId | Статус |
|----------|--------|
| `comp-mvp-packaging-2026-06-21` | closed |
| `comp-mvp-async-v2-2026-06-25` | closed · winner Beta |
