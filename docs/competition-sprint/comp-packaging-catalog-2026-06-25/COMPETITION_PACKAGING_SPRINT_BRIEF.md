# Competition packaging sprint — catalog publish

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-packaging-catalog-2026-06-25` |
| **kind** | `competition-packaging` (post-sprint operator enablement) |
| **parent sprint** | `comp-mvp-async-v2-2026-06-25` (closed, winner Beta) |
| **prompt** | [`COMPETITION_PACKAGING_CATALOG_SPRINT_PROMPT.md`](../../prompts/COMPETITION_PACKAGING_CATALOG_SPRINT_PROMPT.md) |
| **registry id** | `comp-packaging-catalog-2026-06-25` |
| **openedAt** | 2026-06-25 |

---

## Problem

После closure async-v2 competition fork'и были только в `ARCHIVED_*` loaders — **не видны** в device-board UserCase picker. Operator не может по очереди Apply/Run/debug alpha, beta, gamma в браузере.

---

## Constraints

- Bundled `usercase-mvp-microphone` (v2.0-async) **не менять**
- Publish = `tier: community`, `canApply: true`
- Regenerate через `yarn comp:publish-catalog`, не ручной edit generated TS

---

## Definition of Done

| # | Критерий | Статус |
|---|----------|--------|
| D1 | Три async-v2 id в picker | ✅ |
| D2 | `comp-publish-catalog.mjs` + `CATALOG_PUBLISH.json` | ✅ |
| D3 | `COMPETITION_CATALOG_PUBLISH_REGULATION.md` | ✅ |
| D4 | Skill `membrana-competition-packaging` | ✅ |
| D5 | Catalog tests green | ✅ |
| D6 | `COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md` | ✅ |
| D7 | Operator F7 smoke per fork + ODF registry | ⏳ Phase C — [`OPERATOR_DEBUG_LOG.md`](./OPERATOR_DEBUG_LOG.md) |

---

## Deliverable paths

| Артефакт | Путь |
|----------|------|
| Manifest | [`../comp-mvp-async-v2-2026-06-25/CATALOG_PUBLISH.json`](../comp-mvp-async-v2-2026-06-25/CATALOG_PUBLISH.json) |
| Publish state | [`../comp-mvp-async-v2-2026-06-25/CATALOG_PUBLISH_STATE.md`](../comp-mvp-async-v2-2026-06-25/CATALOG_PUBLISH_STATE.md) |
| Generated catalog | `packages/device-board/src/catalog/community-competition-user-case-entries.ts` |
| OPEN | [`../../day-sprint/comp-packaging-catalog-2026-06-25/OPEN.md`](../../day-sprint/comp-packaging-catalog-2026-06-25/OPEN.md) |

---

## Operator script

1. `yarn workspace @membrana/client dev`
2. UserCase list → Alpha / Beta / Gamma (async v2)
3. Apply → Run ≥60s → `yarn logs:parse` → `smoke v2.0-async: PASS`

---

## Commands

```bash
yarn comp:publish-catalog --id comp-mvp-async-v2-2026-06-25
yarn competition:synthesis-async-v2          # Anthropic
yarn competition:synthesis-async-v2 --deepseek
```
